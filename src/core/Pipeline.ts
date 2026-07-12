import * as path from 'path';
import * as fs from 'fs-extra';
import fg from 'fast-glob';
import { Config } from '../config/schema';
import { getAdapter } from '../adapters/registry';
import { I18nAdapter } from '../adapters/I18nAdapter';
import { TextValidator } from '../validation/TextValidator';
import { KeyRegistry } from '../keys/KeyRegistry';
import { proposerFor } from '../keys/proposers';
import { buildLocaleWrites, commitLocaleWrites } from '../locales/LocaleWriter';
import { flatten } from '../locales/tree';
import { transformSource } from './transformFile';
import { FileChange, RunResult, RunStats } from './types';

export interface RunOptions {
  /** Directory to resolve paths against. Defaults to cwd. */
  cwd?: string;
  /** When true, compute all changes but write nothing. */
  dryRun?: boolean;
  /**
   * Pre-assigned `text → key` mappings (e.g. AI-proposed semantic keys). These
   * take precedence over both existing locale keys and the deterministic
   * strategy for the given texts.
   */
  keyOverrides?: Map<string, string>;
}

/**
 * Orchestrates a full transformation run: discover files, transform each,
 * collect keys, and plan locale writes. Planning is fully separated from
 * writing, so a dry run produces the exact same {@link RunResult} — it simply
 * skips the final commit step.
 */
export class Pipeline {
  private readonly adapter: I18nAdapter;
  private readonly validator: TextValidator;

  constructor(private readonly config: Config) {
    this.adapter = getAdapter(config.library);
    this.validator = new TextValidator(config);
  }

  async run(options: RunOptions = {}): Promise<RunResult> {
    const cwd = options.cwd ?? process.cwd();
    const dryRun = options.dryRun ?? false;

    const registry = new KeyRegistry(proposerFor(this.config.keyStrategy));
    const keys = new Map<string, string>();
    // AI/explicit overrides win, so seed them before existing locale keys.
    if (options.keyOverrides) {
      for (const [text, key] of options.keyOverrides) registry.seed(text, key);
    }
    this.seedExistingKeys(cwd, registry, keys);

    const stats = emptyStats();
    const fileChanges: FileChange[] = [];

    const files = await this.findFiles(cwd);
    stats.filesScanned = files.length;

    for (const filePath of files) {
      try {
        const before = await fs.readFile(filePath, 'utf8');
        const result = transformSource(before, {
          filePath,
          adapter: this.adapter,
          validator: this.validator,
          keys: registry,
          config: this.config,
        });

        stats.warnings.push(...result.warnings);

        if (!result.changed) continue;

        for (const extraction of result.extractions) {
          keys.set(extraction.key, extraction.text);
        }

        stats.filesChanged++;
        stats.textsTransformed += result.extractions.length;
        if (result.hookInjected) stats.hooksInjected++;
        if (result.importAdded) stats.importsAdded++;

        fileChanges.push({
          path: filePath,
          before,
          after: result.code,
          extractions: result.extractions,
          hookInjected: result.hookInjected,
          importAdded: result.importAdded,
        });
      } catch (error) {
        stats.errors.push(
          `${path.relative(cwd, filePath)}: ${messageOf(error)}`
        );
      }
    }

    stats.keysCreated = keys.size;
    // Resolve the locales directory against the run cwd so writes land in the
    // target project regardless of process.cwd().
    const resolvedConfig = {
      ...this.config,
      localesDir: path.resolve(cwd, this.config.localesDir),
    };
    const localeWrites = buildLocaleWrites(resolvedConfig, this.adapter, keys);

    if (!dryRun) {
      await this.commit(fileChanges, localeWrites);
    }

    return { fileChanges, localeWrites, keys, stats };
  }

  private async commit(
    fileChanges: FileChange[],
    localeWrites: RunResult['localeWrites']
  ): Promise<void> {
    for (const change of fileChanges) {
      await fs.writeFile(change.path, change.after, 'utf8');
    }
    await commitLocaleWrites(localeWrites);
  }

  private async findFiles(cwd: string): Promise<string[]> {
    const root = path.resolve(cwd, this.config.sourceDir);
    const matches = await fg(this.config.include, {
      cwd: root,
      ignore: this.config.exclude,
      absolute: true,
      onlyFiles: true,
      dot: false,
    });
    return matches.sort();
  }

  /** Seed keys from the existing source-locale file for stable re-runs. */
  private seedExistingKeys(
    cwd: string,
    registry: KeyRegistry,
    keys: Map<string, string>
  ): void {
    const filePath = path.join(
      path.resolve(cwd, this.config.localesDir),
      this.adapter.localeRelativePath(this.config.sourceLocale)
    );
    if (!fs.existsSync(filePath)) return;
    try {
      const tree = fs.readJsonSync(filePath);
      for (const [key, text] of flatten(tree, this.adapter.keySeparator)) {
        registry.seed(text, key);
        keys.set(key, text);
      }
    } catch {
      // Ignore an unreadable/legacy locale file; keys will be regenerated.
    }
  }
}

function emptyStats(): RunStats {
  return {
    filesScanned: 0,
    filesChanged: 0,
    textsTransformed: 0,
    keysCreated: 0,
    hooksInjected: 0,
    importsAdded: 0,
    warnings: [],
    errors: [],
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

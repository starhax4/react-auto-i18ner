import * as fs from 'fs-extra';
import { I18nAdapter } from '../adapters/I18nAdapter';
import { Config } from '../config/schema';
import { LocaleWrite } from '../core/types';
import { commitLocaleWrites, localePath } from '../locales/LocaleWriter';
import { MessageTree, flatten, getNested, setNested, sortTree } from '../locales/tree';
import { AiAgent } from './AiAgent';
import { aiTranslate, TranslationItem } from './tasks';

export interface TranslateResult {
  writes: LocaleWrite[];
  /** Count of newly-filled entries per target locale. */
  filledByLocale: Record<string, number>;
}

/**
 * Fill empty entries in target-locale files using the agent, one locale at a
 * time. Only missing/empty values are translated — existing translations are
 * never overwritten. Returns planned writes so callers can honour dry-run.
 */
export async function translateLocales(
  config: Config,
  adapter: I18nAdapter,
  agent: AiAgent,
  options: { dryRun?: boolean } = {}
): Promise<TranslateResult> {
  const separator = adapter.keySeparator;
  const sourcePath = localePath(config, adapter, config.sourceLocale);
  const sourceEntries = flatten(readTree(sourcePath), separator);

  const writes: LocaleWrite[] = [];
  const filledByLocale: Record<string, number> = {};

  for (const locale of config.targetLocales) {
    if (locale === config.sourceLocale) continue;

    const filePath = localePath(config, adapter, locale);
    const tree = readTree(filePath);

    const pending: TranslationItem[] = [];
    for (const [key, text] of sourceEntries) {
      const current = getNested(tree, key.split(separator));
      if (typeof current !== 'string' || current.trim() === '') {
        pending.push({ key, text });
      }
    }

    if (pending.length === 0) {
      filledByLocale[locale] = 0;
      continue;
    }

    const translations = await aiTranslate(
      agent,
      config.sourceLocale,
      locale,
      pending
    );

    let filled = 0;
    for (const { key } of pending) {
      const value = translations.get(key);
      if (value) {
        setNested(tree, key.split(separator), value, true);
        filled++;
      }
    }
    filledByLocale[locale] = filled;

    const ordered = config.format.sortKeys ? sortTree(tree) : tree;
    writes.push({
      path: filePath,
      before: fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : undefined,
      after: JSON.stringify(ordered, null, config.format.indent) + '\n',
    });
  }

  if (!options.dryRun) {
    await commitLocaleWrites(writes);
  }

  return { writes, filledByLocale };
}

function readTree(filePath: string): MessageTree {
  if (!fs.existsSync(filePath)) return {};
  try {
    const parsed = fs.readJsonSync(filePath);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as MessageTree)
      : {};
  } catch {
    return {};
  }
}

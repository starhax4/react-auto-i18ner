import { getAdapter } from '../../adapters/registry';
import { resolveAgent } from '../../ai/detectAgent';
import { aiNameKeys, KeyNamingItem } from '../../ai/tasks';
import { translateLocales } from '../../ai/translateLocales';
import { Config } from '../../config/schema';
import { loadConfig, saveConfig, DEFAULT_CONFIG_FILENAME } from '../../config/loadConfig';
import { Pipeline } from '../../core/Pipeline';
import { confirmSafeToWrite } from '../guard';
import {
  CommonFlags,
  hasConfigFile,
  overridesFromFlags,
} from '../resolveConfig';
import { runWizard } from '../wizard';
import { printRunSummary, ui } from '../ui';

export interface RunFlags extends CommonFlags {
  dryRun?: boolean;
  yes?: boolean;
}

/** `run` (and the default action): transform the project. Returns an exit code. */
export async function runCommand(flags: RunFlags): Promise<number> {
  const cwd = process.cwd();
  const dryRun = !!flags.dryRun;

  const config = await resolveRunConfig(flags, cwd, dryRun);

  if (!dryRun && !(await confirmSafeToWrite(cwd, !!flags.yes))) {
    ui.info('Aborted — nothing was changed.');
    return 1;
  }

  const keyOverrides = await maybeAiKeys(config, cwd);

  const pipeline = new Pipeline(config);
  const result = await pipeline.run({ cwd, dryRun, keyOverrides });
  printRunSummary(result, dryRun);

  if (!dryRun) {
    await maybeAiTranslate(config);
    if (result.stats.filesChanged > 0) {
      ui.success('Transformation complete.');
      printNextSteps(config);
    } else {
      ui.info('No translatable text found — nothing changed.');
    }
  }

  return result.stats.errors.length > 0 ? 1 : 0;
}

/** Use a saved/overridden config, or launch the wizard for first-time setup. */
async function resolveRunConfig(
  flags: RunFlags,
  cwd: string,
  dryRun: boolean
): Promise<Config> {
  const firstRun = !flags.config && !hasConfigFile(cwd);
  if (firstRun && !flags.yes && !dryRun) {
    const config = await runWizard(cwd);
    saveConfig(config);
    ui.success(`Saved configuration to ${DEFAULT_CONFIG_FILENAME}`);
    return config;
  }
  return loadConfig({
    configPath: flags.config,
    cwd,
    overrides: overridesFromFlags(flags),
  });
}

/** Collect AI-proposed semantic keys via a dry-run pre-pass (best-effort). */
async function maybeAiKeys(
  config: Config,
  cwd: string
): Promise<Map<string, string> | undefined> {
  if (!config.ai.enabled || !config.ai.tasks.nameKeys) return undefined;

  const agent = resolveAgent(config.ai.agent);
  if (!agent) {
    ui.warn('AI key naming enabled but no agent CLI was found; using deterministic keys.');
    return undefined;
  }

  ui.step('Asking the AI agent to name keys…');
  const preview = await new Pipeline(config).run({ cwd, dryRun: true });

  const seen = new Set<string>();
  const items: KeyNamingItem[] = [];
  for (const change of preview.fileChanges) {
    for (const extraction of change.extractions) {
      if (seen.has(extraction.text)) continue;
      seen.add(extraction.text);
      items.push({ text: extraction.text, componentName: extraction.componentName });
    }
  }

  const overrides = await aiNameKeys(agent, items);
  if (overrides.size === 0) {
    ui.warn('AI returned no usable keys; using deterministic keys.');
    return undefined;
  }
  ui.dim(`  AI named ${overrides.size} keys.`);
  return overrides;
}

/** Fill target locales via the agent after a successful transform. */
async function maybeAiTranslate(config: Config): Promise<void> {
  if (!config.ai.enabled || !config.ai.tasks.translate) return;

  const agent = resolveAgent(config.ai.agent);
  if (!agent) return;

  ui.step('Translating target locales with the AI agent…');
  const result = await translateLocales(config, getAdapter(config.library), agent);
  for (const [locale, count] of Object.entries(result.filledByLocale)) {
    if (count > 0) ui.dim(`  ${locale}: filled ${count} entries.`);
  }
}

function printNextSteps(config: Config): void {
  ui.heading('Next steps');
  ui.dim(`  1. Review the diff (git diff).`);
  ui.dim(`  2. Fill translations in ${config.localesDir}.`);
  ui.dim(`  3. Ensure ${config.library} is installed and initialized in your app.`);
}

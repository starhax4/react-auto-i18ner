import { getAdapter } from '../../adapters/registry';
import { resolveAgent } from '../../ai/detectAgent';
import { translateLocales } from '../../ai/translateLocales';
import { loadConfig } from '../../config/loadConfig';
import { CommonFlags, overridesFromFlags } from '../resolveConfig';
import { confirmSafeToWrite } from '../guard';
import { ui } from '../ui';

export interface TranslateFlags extends CommonFlags {
  dryRun?: boolean;
  yes?: boolean;
}

/** `translate`: fill empty target-locale entries using an AI agent. */
export async function translateCommand(flags: TranslateFlags): Promise<number> {
  const cwd = process.cwd();
  const config = loadConfig({
    configPath: flags.config,
    cwd,
    overrides: overridesFromFlags(flags),
  });

  const agent = resolveAgent(
    config.ai.agent ?? (typeof flags.ai === 'string' ? flags.ai : undefined)
  );
  if (!agent) {
    ui.error('No AI agent CLI found (claude, cursor, gemini, aider).');
    ui.dim('  Install one, or fill the locale files manually.');
    return 1;
  }

  const dryRun = !!flags.dryRun;
  if (!dryRun && !(await confirmSafeToWrite(cwd, !!flags.yes))) {
    ui.info('Aborted — nothing was changed.');
    return 1;
  }

  ui.step(`Translating with ${agent.id}…`);
  const result = await translateLocales(
    config,
    getAdapter(config.library),
    agent,
    { dryRun }
  );

  ui.heading(dryRun ? 'Planned translations (dry run)' : 'Translation summary');
  let total = 0;
  for (const [locale, count] of Object.entries(result.filledByLocale)) {
    ui.info(`  ${locale}: ${count} entries`);
    total += count;
  }
  if (total === 0) ui.info('  Nothing to translate — all target locales are complete.');

  return 0;
}

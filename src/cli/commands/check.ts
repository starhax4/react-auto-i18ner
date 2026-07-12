import * as fs from 'fs-extra';
import { getAdapter } from '../../adapters/registry';
import { loadConfig } from '../../config/loadConfig';
import { localePath } from '../../locales/LocaleWriter';
import { MessageTree, flatten, getNested } from '../../locales/tree';
import { CommonFlags, overridesFromFlags } from '../resolveConfig';
import { ui } from '../ui';

/** `check`: report missing/empty keys in each target locale. */
export async function checkCommand(flags: CommonFlags): Promise<number> {
  const cwd = process.cwd();
  const config = loadConfig({
    configPath: flags.config,
    cwd,
    overrides: overridesFromFlags(flags),
  });
  const adapter = getAdapter(config.library);
  const separator = adapter.keySeparator;

  const sourcePath = localePath(config, adapter, config.sourceLocale);
  if (!fs.existsSync(sourcePath)) {
    ui.error(`Source locale not found: ${sourcePath}`);
    ui.dim('  Run the transformer first to generate it.');
    return 1;
  }

  const sourceKeys = flatten(readTree(sourcePath), separator).map(([k]) => k);
  ui.heading('Translation completeness');
  ui.info(`  Source (${config.sourceLocale}): ${sourceKeys.length} keys`);

  let incomplete = false;
  for (const locale of config.targetLocales) {
    if (locale === config.sourceLocale) continue;
    const tree = readTree(localePath(config, adapter, locale));
    const missing = sourceKeys.filter((key) => {
      const value = getNested(tree, key.split(separator));
      return typeof value !== 'string' || value.trim() === '';
    });
    if (missing.length === 0) {
      ui.success(`  ${locale}: complete`);
    } else {
      incomplete = true;
      ui.warn(`  ${locale}: ${missing.length} missing/empty`);
    }
  }

  return incomplete ? 1 : 0;
}

function readTree(filePath: string): MessageTree {
  try {
    const parsed = fs.readJsonSync(filePath);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as MessageTree)
      : {};
  } catch {
    return {};
  }
}

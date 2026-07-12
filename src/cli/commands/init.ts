import { saveConfig, DEFAULT_CONFIG_FILENAME } from '../../config/loadConfig';
import { runWizard } from '../wizard';
import { ui } from '../ui';

/** `init`: run the interactive wizard and write a config file. */
export async function initCommand(): Promise<number> {
  const config = await runWizard();
  saveConfig(config);
  ui.success(`Saved configuration to ${DEFAULT_CONFIG_FILENAME}`);
  ui.dim('  Run `react-auto-i18ner run` to transform your project.');
  return 0;
}

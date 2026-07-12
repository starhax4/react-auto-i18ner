import * as fs from 'fs-extra';
import * as path from 'path';
import { AiAgentId, ConfigInput, LibraryId } from '../config/schema';

/** Flags shared by commands that read configuration. */
export interface CommonFlags {
  config?: string;
  src?: string;
  locales?: string;
  languages?: string;
  library?: LibraryId;
  ai?: AiAgentId | boolean;
}

/** Names searched to decide whether a project is already configured. */
const CONFIG_FILENAMES = [
  'react-auto-i18ner.config.json',
  'i18n.config.json',
  '.i18nrc.json',
];

/** True if a standalone config file exists in `cwd`. */
export function hasConfigFile(cwd: string): boolean {
  return CONFIG_FILENAMES.some((name) => fs.existsSync(path.join(cwd, name)));
}

/** Translate CLI flags into a config override object for {@link loadConfig}. */
export function overridesFromFlags(flags: CommonFlags): ConfigInput {
  const overrides: ConfigInput = {};

  if (flags.src) overrides.sourceDir = flags.src;
  if (flags.locales) overrides.localesDir = flags.locales;
  if (flags.library) overrides.library = flags.library;
  if (flags.languages) {
    overrides.targetLocales = flags.languages
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);
  }
  if (flags.ai !== undefined) {
    if (flags.ai === false) {
      overrides.ai = { enabled: false };
    } else if (flags.ai === true) {
      overrides.ai = { enabled: true };
    } else {
      overrides.ai = { enabled: true, agent: flags.ai };
    }
  }

  return overrides;
}

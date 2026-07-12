import * as fs from 'fs-extra';
import * as path from 'path';
import { z } from 'zod';
import { Config, ConfigInput, configSchema } from './schema';

/** Config file names searched for, in priority order. */
const CONFIG_FILENAMES = [
  'react-auto-i18ner.config.json',
  'i18n.config.json',
  '.i18nrc.json',
];

/** Key read from package.json when no standalone config file exists. */
const PACKAGE_JSON_KEY = 'react-auto-i18ner';

export interface LoadConfigOptions {
  /** Explicit config file path (from `--config`). Takes precedence over auto-discovery. */
  configPath?: string;
  /** Directory to resolve discovery + relative paths against. Defaults to cwd. */
  cwd?: string;
  /** Overrides merged on top of the file config (e.g. from CLI flags). */
  overrides?: ConfigInput;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Load, merge and validate configuration.
 *
 * Precedence (lowest → highest): schema defaults → config file → overrides.
 * The merged input is validated once through the zod schema, so the returned
 * value is always a fully-defaulted, valid {@link Config}.
 */
export function loadConfig(options: LoadConfigOptions = {}): Config {
  const cwd = options.cwd ?? process.cwd();

  const fileInput = readConfigFile(options.configPath, cwd);
  const merged = deepMerge(fileInput ?? {}, options.overrides ?? {});

  try {
    return configSchema.parse(merged);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
      throw new ConfigError(`Invalid configuration:\n${details}`);
    }
    throw error;
  }
}

/**
 * Read raw config input from an explicit path, a discovered file, or a
 * package.json key. Returns `undefined` when no configuration exists (defaults
 * are then used). A malformed explicit path is a hard error; a malformed
 * discovered file is skipped.
 */
function readConfigFile(
  explicitPath: string | undefined,
  cwd: string
): Record<string, unknown> | undefined {
  if (explicitPath) {
    const resolved = path.resolve(cwd, explicitPath);
    if (!fs.existsSync(resolved)) {
      throw new ConfigError(`Config file not found: ${resolved}`);
    }
    let parsed: unknown;
    try {
      parsed = fs.readJsonSync(resolved);
    } catch (error) {
      throw new ConfigError(
        `Could not parse config file ${resolved}: ${errorMessage(error)}`
      );
    }
    if (!isPlainObject(parsed)) {
      throw new ConfigError(
        `Config file ${resolved} must contain a JSON object.`
      );
    }
    return parsed;
  }

  for (const filename of CONFIG_FILENAMES) {
    const resolved = path.resolve(cwd, filename);
    if (fs.existsSync(resolved)) {
      try {
        const parsed = fs.readJsonSync(resolved);
        if (isPlainObject(parsed)) return parsed;
        // Skip a discovered file that isn't a JSON object and keep looking.
      } catch {
        // Skip malformed discovered files and keep looking.
      }
    }
  }

  const packageJsonPath = path.resolve(cwd, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = fs.readJsonSync(packageJsonPath);
      const embedded = pkg[PACKAGE_JSON_KEY];
      if (isPlainObject(embedded)) return embedded;
    } catch {
      // Ignore unreadable package.json.
    }
  }

  return undefined;
}

/** Path where {@link saveConfig} writes by default. */
export const DEFAULT_CONFIG_FILENAME = CONFIG_FILENAMES[0];

/** Persist a config to disk as pretty-printed JSON. */
export function saveConfig(
  config: Config,
  outputPath = DEFAULT_CONFIG_FILENAME
): void {
  fs.writeJsonSync(outputPath, config, { spaces: 2 });
}

/** Deep-merge plain objects; arrays and scalars from `override` replace `base`. */
function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

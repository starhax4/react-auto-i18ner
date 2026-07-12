/**
 * Programmatic API for react-auto-i18ner.
 *
 * The CLI is a thin wrapper around these exports; anything the CLI can do is
 * available here for build-tool integration or scripting.
 */
import { Pipeline, RunOptions } from './core/Pipeline';
import { Config, ConfigInput, configSchema } from './config/schema';
import { RunResult } from './core/types';

export { Pipeline } from './core/Pipeline';
export type { RunOptions } from './core/Pipeline';
export { loadConfig, saveConfig, ConfigError } from './config/loadConfig';
export { configSchema, defaultConfig } from './config/schema';
export type {
  Config,
  ConfigInput,
  LibraryId,
  StackId,
  AiAgentId,
  KeyStrategyId,
} from './config/schema';
export type {
  RunResult,
  RunStats,
  Extraction,
  FileChange,
  LocaleWrite,
} from './core/types';
export { getAdapter, allAdapters } from './adapters/registry';
export type { I18nAdapter } from './adapters/I18nAdapter';
export { detectStack } from './stack/detectStack';
export { recommendFor } from './stack/recommend';
export { TextValidator } from './validation/TextValidator';

/**
 * Transform a project programmatically. Accepts a partial config (validated and
 * defaulted through the schema) and returns the full {@link RunResult}.
 */
export async function transformProject(
  config: ConfigInput = {},
  options: RunOptions = {}
): Promise<RunResult> {
  const validated: Config = configSchema.parse(config);
  return new Pipeline(validated).run(options);
}

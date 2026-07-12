import { reactI18nextAdapter } from '../adapters/reactI18next';
import { I18nAdapter } from '../adapters/I18nAdapter';
import { Config, configSchema } from '../config/schema';
import { KeyRegistry } from '../keys/KeyRegistry';
import { proposerFor } from '../keys/proposers';
import { TextValidator } from '../validation/TextValidator';
import { transformSource, FileTransformResult } from '../core/transformFile';

/** Transform a source string with a fresh context, for unit tests. */
export function transform(
  code: string,
  options: {
    config?: Partial<Config>;
    adapter?: I18nAdapter;
    filePath?: string;
  } = {}
): FileTransformResult {
  const config = configSchema.parse(options.config ?? {});
  const adapter = options.adapter ?? reactI18nextAdapter;
  return transformSource(code, {
    filePath: options.filePath ?? '/project/src/App.tsx',
    adapter,
    validator: new TextValidator(config),
    keys: new KeyRegistry(proposerFor(config.keyStrategy)),
    config,
  });
}

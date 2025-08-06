// Main library exports
export { I18nTransformer } from './core/I18nTransformer';
export { UniversalTransformer } from './core/UniversalTransformer';
export { ConfigManager } from './core/ConfigManager';
export { TextValidator } from './utils/TextValidator';
export { JavaScriptTransformer } from './utils/JavaScriptTransformer';

// Type exports
export * from './types';

// Utility functions for programmatic usage
export async function transformProject(
  config?: Partial<import('./types').I18nConfig>
) {
  const { UniversalTransformer } = await import('./core/UniversalTransformer');
  const { ConfigManager } = await import('./core/ConfigManager');

  const configManager = ConfigManager.getInstance();
  if (config) {
    configManager.updateConfig(config);
  }
  const fullConfig = configManager.getConfig();

  const transformer = new UniversalTransformer(fullConfig);
  return transformer.transform();
}

export async function validateText(
  text: string,
  config?: Partial<import('./types').I18nConfig>
) {
  const { TextValidator } = await import('./utils/TextValidator');
  const { ConfigManager } = await import('./core/ConfigManager');

  const configManager = ConfigManager.getInstance();
  if (config) {
    configManager.updateConfig(config);
  }
  const fullConfig = configManager.getConfig();

  const validator = new TextValidator(fullConfig);
  return validator.validateWithDetails(text);
}

export async function createConfig(options?: {
  interactive?: boolean;
  outputPath?: string;
}) {
  const { ConfigManager } = await import('./core/ConfigManager');

  const configManager = ConfigManager.getInstance();
  const config = configManager.createSampleConfig();

  if (options?.outputPath) {
    configManager.saveConfig(config, options.outputPath);
  }

  return config;
}

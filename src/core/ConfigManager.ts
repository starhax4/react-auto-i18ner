import { I18nConfig, ValidationRule, PackageDefaults } from '../types';
import * as path from 'path';
import * as fs from 'fs-extra';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: I18nConfig;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private getDefaultConfig(): I18nConfig {
    return {
      srcDir: './src',
      outputDir: './src/locales',
      backupDir: './i18n-backup',

      sourceLanguage: 'en',
      targetLanguages: ['es', 'fr', 'de', 'pt'],

      include: ['**/*.{tsx,jsx}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.stories.*',
      ],

      transformation: {
        extractJSXText: true,
        extractAttributes: true,
        extractButtonText: true,
        extractTooltips: true,
        extractAriaLabels: true,
        extractPlaceholders: true,
      },

      components: {
        addUseTranslationHook: true,
        supportClassComponents: true,
        customHookImport: 'react-i18next',
      },

      validation: {
        minLength: 2,
        maxLength: 500,
        skipTechnicalTerms: true,
        skipCodeFragments: true,
        skipNumbers: true,
        skipPaths: true,
        customSkipPatterns: [],
      },

      format: {
        indent: 2,
        sortKeys: true,
        keyStrategy: 'text',
        keyPrefix: '',
        keySeparator: '.',
      },

      advanced: {
        preserveWhitespace: false,
        handleNestedComponents: true,
        generateTypeDefinitions: true,
        createBackup: true,
      },
    };
  }

  public getDefaults(): PackageDefaults {
    return {
      config: this.getDefaultConfig(),
      validationRules: this.getDefaultValidationRules(),
      technicalTerms: this.getDefaultTechnicalTerms(),
      commonAttributes: this.getDefaultAttributes(),
    };
  }

  private getDefaultValidationRules(): ValidationRule[] {
    return [
      {
        name: 'template-literal',
        pattern: /'\s*\+\s*|'\s*\+\s*'/,
        description: 'Template literal fragments',
        severity: 'error',
      },
      {
        name: 'conditional-expression',
        pattern: /\?\s*\(|\)\s*:/,
        description: 'Conditional expressions',
        severity: 'error',
      },
      {
        name: 'jsx-expression',
        pattern: /\{|\}|<|>/,
        description: 'JSX expressions or HTML tags',
        severity: 'error',
      },
      {
        name: 'code-keywords',
        pattern:
          /\b(import|export|const|let|var|function|class|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|async|await|typeof|instanceof)\b/,
        description: 'JavaScript/TypeScript keywords',
        severity: 'error',
      },
      {
        name: 'css-units',
        pattern: /^\d+(px|em|rem|vh|vw|%|deg|s|ms)$/i,
        description: 'CSS units',
        severity: 'warning',
      },
      {
        name: 'css-classes',
        pattern:
          /^(h-|w-|px-|py-|mx-|my-|bg-|text-|border-|rounded-|flex|grid|block|inline|hidden)/,
        description: 'CSS class names',
        severity: 'warning',
      },
      {
        name: 'hex-colors',
        pattern: /^#[0-9a-fA-F]{3,8}$/,
        description: 'Hex color codes',
        severity: 'info',
      },
      {
        name: 'urls',
        pattern: /^https?:\/\/|^www\.|^\/[\/\w.-]+/,
        description: 'URLs and file paths',
        severity: 'info',
      },
    ];
  }

  private getDefaultTechnicalTerms(): string[] {
    return [
      'true',
      'false',
      'null',
      'undefined',
      'NaN',
      'auto',
      'none',
      'inherit',
      'initial',
      'unset',
      'block',
      'inline',
      'flex',
      'grid',
      'center',
      'left',
      'right',
      'top',
      'bottom',
      'submit',
      'button',
      'text',
      'email',
      'password',
      'loading',
      'error',
      'success',
      'warning',
      'info',
      'debug',
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
      'HEAD',
      'OPTIONS',
      'React',
      'Component',
      'useState',
      'useEffect',
      'useCallback',
      'useMemo',
      'JSX',
      'HTML',
      'CSS',
      'JavaScript',
      'TypeScript',
      'JSON',
      'XML',
      'API',
      'HTTP',
      'HTTPS',
      'URL',
      'URI',
      'DOM',
      'BOM',
    ];
  }

  private getDefaultAttributes(): string[] {
    return [
      'placeholder',
      'title',
      'alt',
      'aria-label',
      'aria-description',
      'aria-placeholder',
      'label',
      'value',
      'defaultValue',
      'tooltip',
    ];
  }

  public loadConfig(configPath?: string): I18nConfig {
    if (configPath && fs.existsSync(configPath)) {
      try {
        const userConfig = fs.readJsonSync(configPath);
        this.config = this.mergeConfigs(this.getDefaultConfig(), userConfig);
      } catch (error) {
        console.warn(
          `Warning: Could not load config from ${configPath}, using defaults`
        );
      }
    } else {
      // Look for common config file names
      const commonPaths = [
        './react-auto-i18ner.config.json',
        './i18n.config.json',
        './.i18nrc.json',
        './package.json',
      ];

      for (const path of commonPaths) {
        if (fs.existsSync(path)) {
          try {
            let config;
            if (path.endsWith('package.json')) {
              const pkg = fs.readJsonSync(path);
              config = pkg['react-auto-i18ner'] || pkg['i18n'];
            } else {
              config = fs.readJsonSync(path);
            }

            if (config) {
              this.config = this.mergeConfigs(this.getDefaultConfig(), config);
              console.log(`📋 Loaded configuration from ${path}`);
              break;
            }
          } catch (error) {
            // Continue to next file
          }
        }
      }
    }

    return this.config;
  }

  public saveConfig(
    config: I18nConfig,
    outputPath: string = './react-auto-i18ner.config.json'
  ): void {
    fs.writeJsonSync(outputPath, config, { spaces: 2 });
    console.log(`💾 Configuration saved to ${outputPath}`);
  }

  public getConfig(): I18nConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<I18nConfig>): void {
    this.config = this.mergeConfigs(this.config, updates);
  }

  private mergeConfigs(base: I18nConfig, override: any): I18nConfig {
    return {
      ...base,
      ...override,
      transformation: {
        ...base.transformation,
        ...(override.transformation || {}),
      },
      components: {
        ...base.components,
        ...(override.components || {}),
      },
      validation: {
        ...base.validation,
        ...(override.validation || {}),
      },
      format: {
        ...base.format,
        ...(override.format || {}),
      },
      advanced: {
        ...base.advanced,
        ...(override.advanced || {}),
      },
    };
  }

  public validateConfig(config: I18nConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate required fields
    if (!config.srcDir) errors.push('srcDir is required');
    if (!config.outputDir) errors.push('outputDir is required');
    if (!config.sourceLanguage) errors.push('sourceLanguage is required');
    if (!config.targetLanguages || config.targetLanguages.length === 0) {
      errors.push('At least one target language is required');
    }

    // Validate paths
    if (config.srcDir && !fs.existsSync(config.srcDir)) {
      errors.push(`Source directory does not exist: ${config.srcDir}`);
    }

    // Validate language codes (basic check)
    const validLanguagePattern = /^[a-z]{2}(-[A-Z]{2})?$/;
    if (
      config.sourceLanguage &&
      !validLanguagePattern.test(config.sourceLanguage)
    ) {
      errors.push(`Invalid source language code: ${config.sourceLanguage}`);
    }

    config.targetLanguages?.forEach((lang) => {
      if (!validLanguagePattern.test(lang)) {
        errors.push(`Invalid target language code: ${lang}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public createSampleConfig(): I18nConfig {
    return {
      ...this.getDefaultConfig(),
      // Add some example customizations
      targetLanguages: ['es', 'fr'],
      validation: {
        ...this.getDefaultConfig().validation,
        customSkipPatterns: [
          '^\\d+$', // Numbers only
          '^[A-Z_]+$', // Constants
          '^\\w+\\.(js|ts|tsx|jsx)$', // File names
        ],
      },
    };
  }
}

export default ConfigManager;

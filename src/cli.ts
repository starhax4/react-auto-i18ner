#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as glob from 'glob';
import { UniversalTransformer } from './core/UniversalTransformer';
import { ConfigManager } from './core/ConfigManager';
import { TextValidator } from './utils/TextValidator';
import { I18nConfig } from './types';

const program = new Command();

// Helper function to validate if this is a React project
async function validateReactProject(): Promise<{
  isValid: boolean;
  projectType: 'typescript' | 'javascript' | 'unknown';
  componentFiles: number;
  issues: string[];
}> {
  const issues: string[] = [];
  const projectRoot = process.cwd();

  // Check for package.json
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!(await fs.pathExists(packageJsonPath))) {
    issues.push('No package.json found');
    return {
      isValid: false,
      projectType: 'unknown',
      componentFiles: 0,
      issues,
    };
  }

  // Check for React dependencies
  let packageJson: any;
  try {
    packageJson = await fs.readJson(packageJsonPath);
  } catch (error) {
    issues.push('Could not read package.json');
    return {
      isValid: false,
      projectType: 'unknown',
      componentFiles: 0,
      issues,
    };
  }

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
  };

  if (!allDeps.react && !allDeps['@types/react']) {
    issues.push('React dependency not found in package.json');
  }

  // Check for src directory
  const srcDir = path.join(projectRoot, 'src');
  if (!(await fs.pathExists(srcDir))) {
    issues.push('No src/ directory found');
  }

  // Detect project type and count component files
  let projectType: 'typescript' | 'javascript' | 'unknown' = 'unknown';
  let componentFiles = 0;

  try {
    const tsFiles = glob.sync('src/**/*.{tsx,ts}', { cwd: projectRoot });
    const jsFiles = glob.sync('src/**/*.{jsx,js}', { cwd: projectRoot });

    componentFiles =
      tsFiles.filter((f) => f.endsWith('.tsx')).length +
      jsFiles.filter((f) => f.endsWith('.jsx')).length;

    if (tsFiles.length > 0 || allDeps.typescript || allDeps['@types/react']) {
      projectType = 'typescript';
    } else if (jsFiles.length > 0) {
      projectType = 'javascript';
    }

    if (componentFiles === 0) {
      issues.push('No React component files (.jsx/.tsx) found in src/');
    }
  } catch (error) {
    issues.push('Could not scan for component files');
  }

  return {
    isValid: issues.length === 0,
    projectType,
    componentFiles,
    issues,
  };
}

// Helper function to run the transformation
async function runTransformation(options: any): Promise<void> {
  const spinner = ora('Initializing transformation...').start();

  try {
    // Load configuration
    const configManager = ConfigManager.getInstance();
    const config = configManager.loadConfig(options.config);

    // Apply CLI overrides
    if (options.src) config.srcDir = options.src;
    if (options.output) config.outputDir = options.output;
    if (options.languages) {
      config.targetLanguages = options.languages
        .split(',')
        .map((l: string) => l.trim());
    }
    if (options.transformer && options.transformer !== 'auto') {
      config.advanced.transformerType = options.transformer;
    }
    if (options.backup === false) {
      config.advanced.createBackup = false;
    }

    // Validate configuration
    const validation = configManager.validateConfig(config);
    if (!validation.valid) {
      spinner.fail('Configuration validation failed');
      validation.errors.forEach((error: string) =>
        console.error(chalk.red(`  ❌ ${error}`))
      );
      process.exit(1);
    }

    spinner.text = 'Starting transformation...';

    // Create transformer and run
    const transformer = new UniversalTransformer(config);
    const result =
      options.transformer && options.transformer !== 'auto'
        ? await transformer.transformWithType(
            options.transformer as 'typescript' | 'javascript'
          )
        : await transformer.transform();

    if (result.success) {
      spinner.succeed('🎉 Transformation completed successfully!');

      console.log(chalk.green('\n✨ Transformation Summary:'));
      console.log(`   📁 Files processed: ${result.stats.filesProcessed}`);
      console.log(`   📝 Texts transformed: ${result.stats.textsTransformed}`);
      console.log(`   📦 Imports added: ${result.stats.importsAdded}`);
      console.log(`   🔗 Hooks added: ${result.stats.hooksAdded}`);
      console.log(`   🗝️  Translation keys: ${result.translationKeys.size}`);

      if (result.backupPath) {
        console.log(chalk.blue(`   💾 Backup created: ${result.backupPath}`));
      }

      if (result.stats.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        result.stats.warnings.forEach((warning: string) =>
          console.log(chalk.yellow(`   ${warning}`))
        );
      }

      console.log(chalk.cyan('\n🚀 Next Steps:'));
      console.log(chalk.cyan('   1. Review the generated translation files'));
      console.log(
        chalk.cyan('   2. Translate the values in each language file')
      );
      console.log(
        chalk.cyan('   3. Set up react-i18next in your app if not already done')
      );
    } else {
      spinner.fail('Transformation failed');
      console.error(chalk.red('\n❌ Errors:'));
      result.stats.errors.forEach((error: string) =>
        console.error(chalk.red(`   ${error}`))
      );
      process.exit(1);
    }
  } catch (error) {
    spinner.fail('Transformation failed');
    console.error(
      chalk.red(`Error: ${error instanceof Error ? error.message : error}`)
    );
    process.exit(1);
  }
}

program
  .name('react-auto-i18ner')
  .description(
    'Automated React i18n transformation tool - Run without arguments to auto-transform your project!'
  )
  .version('1.0.0');

// Add global options for the default command
program
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-s, --src <path>', 'Source directory (default: ./src)')
  .option(
    '-o, --output <path>',
    'Output directory for translations (default: ./src/locales)'
  )
  .option(
    '-l, --languages <langs>',
    'Target languages (comma-separated)',
    'es,fr,de'
  )
  .option(
    '-t, --transformer <type>',
    'Force transformer type: auto, typescript, javascript',
    'auto'
  )
  .option('--dry-run', 'Run without making changes')
  .option('--verbose', 'Verbose output')
  .option('--no-backup', 'Skip creating backup before transformation')
  .option('--interactive', 'Interactive mode with confirmations');

// Default action when no command is specified - this is the magic! 🎯
program.action(async (options) => {
  console.log(
    chalk.cyan('🚀 React Auto i18ner - One-Command Transformation\n')
  );

  const spinner = ora('Detecting project structure...').start();

  try {
    // Auto-detect if this looks like a React project
    const projectValidation = await validateReactProject();

    if (!projectValidation.isValid) {
      spinner.fail("This doesn't appear to be a React project");
      console.log(chalk.red('\n❌ Requirements not met:'));
      projectValidation.issues.forEach((issue) =>
        console.log(chalk.red(`   • ${issue}`))
      );
      console.log(
        chalk.yellow("\n💡 Make sure you're in a React project directory with:")
      );
      console.log(chalk.yellow('   • package.json with React dependencies'));
      console.log(chalk.yellow('   • src/ directory with .jsx/.tsx files'));

      console.log(chalk.cyan('\n📖 Usage Examples:'));
      console.log(
        chalk.white(
          '   npx react-auto-i18ner                    # Auto-transform current directory'
        )
      );
      console.log(
        chalk.white(
          '   npx react-auto-i18ner --src ./components # Custom source directory'
        )
      );
      console.log(
        chalk.white(
          '   npx react-auto-i18ner --languages "es,fr,de,it" # Custom languages'
        )
      );
      console.log(
        chalk.white(
          '   npx react-auto-i18ner --dry-run         # Preview changes without applying'
        )
      );
      console.log(
        chalk.white(
          '   npx react-auto-i18ner init --interactive # Interactive setup'
        )
      );

      process.exit(1);
    }

    spinner.succeed('✅ React project detected!');
    console.log(
      chalk.green(`   📁 Project type: ${projectValidation.projectType}`)
    );
    console.log(
      chalk.green(
        `   📄 Found ${projectValidation.componentFiles} component file(s)`
      )
    );

    // Show what will happen (unless --no-interactive)
    if (!options.interactive === false) {
      console.log(chalk.cyan('\n🔄 Transformation Plan:'));
      console.log(`   • Source: ${options.src || './src'}`);
      console.log(`   • Output: ${options.output || './src/locales'}`);
      console.log(`   • Languages: ${options.languages || 'es,fr,de'}`);
      console.log(
        `   • Backup: ${options.backup !== false ? '✅ Yes' : '❌ No'}`
      );

      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Continue with transformation?',
          default: true,
        },
      ]);

      if (!proceed) {
        console.log(chalk.yellow('Transformation cancelled.'));
        process.exit(0);
      }
    }

    await runTransformation(options);
  } catch (error) {
    spinner.fail('Transformation failed');
    console.error(
      chalk.red(`Error: ${error instanceof Error ? error.message : error}`)
    );

    // Show help information on error
    console.log(chalk.cyan('\n📖 For more options, run:'));
    console.log(chalk.white('   npx react-auto-i18ner --help'));

    process.exit(1);
  }
});

// Transform command (explicit)
program
  .command('transform')
  .description('Transform React components for i18n (explicit command)')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-s, --src <path>', 'Source directory (default: ./src)')
  .option(
    '-o, --output <path>',
    'Output directory for translations (default: ./src/locales)'
  )
  .option(
    '-l, --languages <langs>',
    'Target languages (comma-separated)',
    'es,fr,de'
  )
  .option(
    '-t, --transformer <type>',
    'Force transformer type: auto, typescript, javascript',
    'auto'
  )
  .option('--dry-run', 'Run without making changes')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    const spinner = ora('Initializing transformation...').start();

    try {
      // Load configuration
      const configManager = ConfigManager.getInstance();
      const config = configManager.loadConfig(options.config);

      // Apply CLI overrides
      if (options.src) config.srcDir = options.src;
      if (options.output) config.outputDir = options.output;
      if (options.languages) {
        config.targetLanguages = options.languages
          .split(',')
          .map((l: string) => l.trim());
      }
      if (options.transformer && options.transformer !== 'auto') {
        config.advanced.transformerType = options.transformer;
      }

      // Validate configuration
      const validation = configManager.validateConfig(config);
      if (!validation.valid) {
        spinner.fail('Configuration validation failed');
        validation.errors.forEach((error) =>
          console.error(chalk.red(`  ❌ ${error}`))
        );
        process.exit(1);
      }

      spinner.text = 'Starting transformation...';

      // Create transformer and run
      const transformer = new UniversalTransformer(config);
      const result =
        options.transformer && options.transformer !== 'auto'
          ? await transformer.transformWithType(
              options.transformer as 'typescript' | 'javascript'
            )
          : await transformer.transform();

      if (result.success) {
        spinner.succeed('Transformation completed successfully!');

        console.log(chalk.green('\n🎉 Transformation Summary:'));
        console.log(`   📁 Files processed: ${result.stats.filesProcessed}`);
        console.log(
          `   📝 Texts transformed: ${result.stats.textsTransformed}`
        );
        console.log(`   📦 Imports added: ${result.stats.importsAdded}`);
        console.log(`   🔗 Hooks added: ${result.stats.hooksAdded}`);
        console.log(`   🗝️  Translation keys: ${result.translationKeys.size}`);

        if (result.stats.warnings.length > 0) {
          console.log(chalk.yellow('\n⚠️  Warnings:'));
          result.stats.warnings.forEach((warning: string) =>
            console.log(chalk.yellow(`   ${warning}`))
          );
        }

        if (result.backupPath) {
          console.log(chalk.blue(`\n💾 Backup created: ${result.backupPath}`));
        }

        console.log(chalk.green('\n✅ Next steps:'));
        console.log('   1. Review the generated translation files');
        console.log('   2. Translate empty strings in target language files');
        console.log('   3. Test your application with different languages');
      } else {
        spinner.fail('Transformation failed');

        if (result.stats.errors.length > 0) {
          console.log(chalk.red('\n❌ Errors:'));
          result.stats.errors.forEach((error: string) =>
            console.log(chalk.red(`   ${error}`))
          );
        }
        process.exit(1);
      }
    } catch (error: any) {
      spinner.fail(`Transformation failed: ${error.message}`);
      if (options.verbose) {
        console.error(chalk.red(error.stack));
      }
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize configuration file')
  .option('-i, --interactive', 'Interactive configuration setup')
  .action(async (options) => {
    const spinner = ora('Initializing configuration...').start();

    try {
      const configManager = ConfigManager.getInstance();
      let config: I18nConfig;

      if (options.interactive) {
        spinner.stop();
        config = await interactiveSetup();
        spinner.start('Saving configuration...');
      } else {
        config = configManager.createSampleConfig();
      }

      configManager.saveConfig(config);
      spinner.succeed('Configuration initialized successfully!');

      console.log(
        chalk.green(
          '\n📋 Configuration file created: react-auto-i18ner.config.json'
        )
      );
      console.log(
        chalk.blue('\n💡 You can now run: react-auto-i18ner transform')
      );
    } catch (error) {
      spinner.fail(
        `Initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate translation files and extracted texts')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-f, --file <path>', 'Validate specific file')
  .action(async (options) => {
    const spinner = ora('Validating...').start();

    try {
      const configManager = ConfigManager.getInstance();
      const config = configManager.loadConfig(options.config);
      const validator = new TextValidator(config);

      if (options.file) {
        // Validate specific file
        await validateFile(options.file, validator, spinner);
      } else {
        // Validate translation files
        await validateTranslationFiles(config, validator, spinner);
      }
    } catch (error) {
      spinner.fail(
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// Extract command (for analysis only)
program
  .command('extract')
  .description('Extract translatable texts without transformation')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-o, --output <path>', 'Output file for extracted texts (JSON)')
  .action(async (options) => {
    const spinner = ora('Extracting texts...').start();

    try {
      const configManager = ConfigManager.getInstance();
      const config = configManager.loadConfig(options.config);

      // Create transformer but only extract
      const { UniversalTransformer } = await import(
        './core/UniversalTransformer'
      );
      const transformer = new UniversalTransformer(config);
      // TODO: Add extract-only method

      spinner.succeed('Text extraction completed!');
    } catch (error) {
      spinner.fail(
        `Extraction failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// Analyze command
program
  .command('analyze')
  .description('Analyze project structure and provide recommendations')
  .option('-c, --config <path>', 'Path to configuration file')
  .action(async (options) => {
    const spinner = ora('Analyzing project...').start();

    try {
      const configManager = ConfigManager.getInstance();
      const config = configManager.loadConfig(options.config);

      const transformer = new UniversalTransformer(config);
      const analysis = await transformer.analyzeProject();

      spinner.succeed('Analysis completed!');

      console.log(chalk.green('\n🔍 Project Analysis Report'));
      console.log('='.repeat(50));
      console.log(`📦 Project Type: ${chalk.cyan(analysis.projectType)}`);
      console.log(`📁 Total Files: ${analysis.files.total}`);
      console.log(`📄 TypeScript Files: ${analysis.files.typescript.length}`);
      console.log(`📄 JavaScript Files: ${analysis.files.javascript.length}`);

      console.log(chalk.blue('\n⚙️  Configuration:'));
      console.log(
        `   TypeScript Config: ${analysis.config.hasTsConfig ? '✅' : '❌'}`
      );
      console.log(
        `   Package.json: ${analysis.config.hasPackageJson ? '✅' : '❌'}`
      );
      console.log(
        `   TypeScript Dependencies: ${analysis.config.hasTypeScriptDeps ? '✅' : '❌'}`
      );

      if (analysis.recommendations.length > 0) {
        console.log(chalk.yellow('\n💡 Recommendations:'));
        analysis.recommendations.forEach((rec) =>
          console.log(chalk.yellow(`   • ${rec}`))
        );
      }
    } catch (error: any) {
      spinner.fail(`Analysis failed: ${error.message}`);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show project i18n statistics')
  .option('-c, --config <path>', 'Path to configuration file')
  .action(async (options) => {
    const spinner = ora('Analyzing project...').start();

    try {
      const configManager = ConfigManager.getInstance();
      const config = configManager.loadConfig(options.config);

      // TODO: Add stats analysis

      spinner.succeed('Analysis completed!');
    } catch (error: any) {
      spinner.fail(`Analysis failed: ${error.message}`);
      process.exit(1);
    }
  });

async function interactiveSetup(): Promise<I18nConfig> {
  console.log(chalk.blue('\n🔧 Interactive Configuration Setup\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'srcDir',
      message: 'Source directory:',
      default: './src',
    },
    {
      type: 'input',
      name: 'outputDir',
      message: 'Output directory for translations:',
      default: './src/locales',
    },
    {
      type: 'input',
      name: 'sourceLanguage',
      message: 'Source language code:',
      default: 'en',
    },
    {
      type: 'input',
      name: 'targetLanguages',
      message: 'Target languages (comma-separated):',
      default: 'es,fr,de',
    },
    {
      type: 'list',
      name: 'keyStrategy',
      message: 'Translation key strategy:',
      choices: [
        { name: 'Use text as key', value: 'text' },
        { name: 'Generate hash-based keys', value: 'hash' },
        { name: 'Use path-based keys', value: 'path' },
      ],
      default: 'text',
    },
    {
      type: 'checkbox',
      name: 'transformations',
      message: 'What to transform:',
      choices: [
        { name: 'JSX text content', value: 'extractJSXText', checked: true },
        {
          name: 'HTML attributes (placeholder, title, etc.)',
          value: 'extractAttributes',
          checked: true,
        },
        { name: 'Button text', value: 'extractButtonText', checked: true },
        { name: 'Tooltips', value: 'extractTooltips', checked: true },
        { name: 'ARIA labels', value: 'extractAriaLabels', checked: true },
      ],
    },
    {
      type: 'confirm',
      name: 'createBackup',
      message: 'Create backup before transformation?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'generateTypes',
      message: 'Generate TypeScript type definitions?',
      default: true,
    },
  ]);

  // Build config from answers
  const configManager = ConfigManager.getInstance();
  const baseConfig = configManager.createSampleConfig();

  return {
    ...baseConfig,
    srcDir: answers.srcDir,
    outputDir: answers.outputDir,
    sourceLanguage: answers.sourceLanguage,
    targetLanguages: answers.targetLanguages
      .split(',')
      .map((l: string) => l.trim()),
    format: {
      ...baseConfig.format,
      keyStrategy: answers.keyStrategy,
    },
    transformation: {
      extractJSXText: answers.transformations.includes('extractJSXText'),
      extractAttributes: answers.transformations.includes('extractAttributes'),
      extractButtonText: answers.transformations.includes('extractButtonText'),
      extractTooltips: answers.transformations.includes('extractTooltips'),
      extractAriaLabels: answers.transformations.includes('extractAriaLabels'),
      extractPlaceholders:
        answers.transformations.includes('extractAttributes'),
    },
    advanced: {
      ...baseConfig.advanced,
      createBackup: answers.createBackup,
      generateTypeDefinitions: answers.generateTypes,
    },
  };
}

async function validateFile(
  filePath: string,
  validator: TextValidator,
  spinner: ora.Ora
): Promise<void> {
  const content = await fs.readFile(filePath, 'utf8');
  // TODO: Implement file validation
  spinner.succeed(`File ${filePath} validated`);
}

async function validateTranslationFiles(
  config: I18nConfig,
  validator: TextValidator,
  spinner: ora.Ora
): Promise<void> {
  // TODO: Implement translation file validation
  spinner.succeed('Translation files validated');
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled rejection:'), error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught exception:'), error);
  process.exit(1);
});

program.parse();

export { program };

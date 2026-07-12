#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigError } from '../config/loadConfig';
import { runCommand, RunFlags } from './commands/run';
import { initCommand } from './commands/init';
import { translateCommand, TranslateFlags } from './commands/translate';
import { checkCommand } from './commands/check';
import { analyzeCommand } from './commands/analyze';
import { CommonFlags } from './resolveConfig';
import { ui } from './ui';

function version(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')
    );
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** Options shared by config-reading commands. */
function addCommonOptions(cmd: Command): Command {
  return cmd
    .option('-c, --config <path>', 'path to a config file')
    .option('-s, --src <dir>', 'source directory to scan')
    .option('-o, --locales <dir>', 'directory for locale files')
    .option('-l, --languages <list>', 'target languages (comma-separated)')
    .option('--library <id>', 'i18n library: react-i18next | next-intl')
    .option('--ai [agent]', 'use an AI agent (claude|cursor|gemini|aider); or --no-ai');
}

/** Run an async action, mapping errors to clean output + a non-zero exit. */
function handle<A extends unknown[]>(action: (...args: A) => Promise<number>) {
  return async (...args: A) => {
    try {
      const code = await action(...args);
      process.exitCode = code;
    } catch (error) {
      if (error instanceof ConfigError) {
        ui.error(error.message);
      } else {
        ui.error(error instanceof Error ? error.message : String(error));
      }
      process.exitCode = 1;
    }
  };
}

const program = new Command();

program
  .name('react-auto-i18ner')
  .description('Automated, AST-based React i18n: extract text, wrap in t(), generate locale files.')
  .version(version());

// `run` is the default command, so bare `npx react-auto-i18ner` runs it.
// Options live only on the subcommand — declaring them on the root too would
// make commander treat them as global and leave the subcommand's opts empty.
addCommonOptions(
  program
    .command('run', { isDefault: true })
    .description('transform the project (default command)')
)
  .option('--dry-run', 'preview changes without writing any files')
  .option('--yes', 'skip confirmation prompts (for CI)')
  .action(handle((flags: RunFlags) => runCommand(flags)));

program
  .command('init')
  .description('interactive setup — detect stack, choose library, write config')
  .action(handle(() => initCommand()));

addCommonOptions(
  program
    .command('translate')
    .description('fill empty target-locale entries using an AI agent')
)
  .option('--dry-run', 'preview translations without writing')
  .option('--yes', 'skip confirmation prompts (for CI)')
  .action(handle((flags: TranslateFlags) => translateCommand(flags)));

addCommonOptions(
  program.command('check').description('report missing/empty translations')
).action(handle((flags: CommonFlags) => checkCommand(flags)));

addCommonOptions(
  program
    .command('analyze')
    .description('report detected stack, file counts and recommendations')
).action(handle((flags: CommonFlags) => analyzeCommand(flags)));

program.parseAsync().catch((error) => {
  ui.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

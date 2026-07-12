import chalk from 'chalk';
import { RunResult } from '../core/types';

/** Thin, consistent console output helpers. */
export const ui = {
  info: (msg: string) => console.log(msg),
  step: (msg: string) => console.log(chalk.cyan(msg)),
  success: (msg: string) => console.log(chalk.green(`✔ ${msg}`)),
  warn: (msg: string) => console.log(chalk.yellow(`⚠ ${msg}`)),
  error: (msg: string) => console.error(chalk.red(`✖ ${msg}`)),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  heading: (msg: string) => console.log(chalk.bold(`\n${msg}`)),
};

/** Print a human summary of a run (used by `run` and `--dry-run`). */
export function printRunSummary(result: RunResult, dryRun: boolean): void {
  const { stats } = result;

  ui.heading(dryRun ? 'Planned changes (dry run)' : 'Transformation summary');
  ui.info(`  Files scanned:      ${stats.filesScanned}`);
  ui.info(`  Files changed:      ${stats.filesChanged}`);
  ui.info(`  Texts transformed:  ${stats.textsTransformed}`);
  ui.info(`  Hooks injected:     ${stats.hooksInjected}`);
  ui.info(`  Translation keys:   ${stats.keysCreated}`);

  if (dryRun && result.fileChanges.length > 0) {
    ui.heading('Files that would change');
    for (const change of result.fileChanges) {
      ui.dim(`  ${change.path} (${change.extractions.length})`);
    }
    const localeChanges = result.localeWrites.filter(
      (w) => w.before !== w.after
    );
    if (localeChanges.length > 0) {
      ui.heading('Locale files that would change');
      for (const write of localeChanges) ui.dim(`  ${write.path}`);
    }
  }

  if (stats.warnings.length > 0) {
    ui.heading('Warnings');
    for (const warning of dedupe(stats.warnings)) ui.warn(`  ${warning}`);
  }

  if (stats.errors.length > 0) {
    ui.heading('Errors');
    for (const error of stats.errors) ui.error(`  ${error}`);
  }
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

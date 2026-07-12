import { execFileSync } from 'child_process';

export interface GitStatus {
  isRepo: boolean;
  /** True when there are uncommitted changes in the working tree. */
  isDirty: boolean;
}

/**
 * Inspect the working tree so the CLI can warn before mutating files.
 *
 * This replaces the previous approach of copying the user's entire source tree
 * into an `i18n-backup/` directory on every run. Version control already gives
 * a far better safety net: with a clean tree, every change this tool makes is
 * reviewable via `git diff` and revertable via `git checkout`.
 */
export function gitStatus(cwd = process.cwd()): GitStatus {
  if (!run(['rev-parse', '--is-inside-work-tree'], cwd)) {
    return { isRepo: false, isDirty: false };
  }
  const porcelain = run(['status', '--porcelain'], cwd);
  return { isRepo: true, isDirty: porcelain !== null && porcelain.trim() !== '' };
}

/** Run a git command, returning stdout or null if git is unavailable/fails. */
function run(args: string[], cwd: string): string | null {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

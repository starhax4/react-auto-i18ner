import inquirer from 'inquirer';
import { gitStatus } from '../core/gitGuard';
import { ui } from './ui';

/**
 * Confirm it's safe to mutate the working tree. With a clean git tree, changes
 * are trivially reviewable/revertable, so we proceed silently. With a dirty (or
 * non-git) tree we warn and ask — unless `--yes` was passed. Never copies code.
 */
export async function confirmSafeToWrite(
  cwd: string,
  yes: boolean
): Promise<boolean> {
  const status = gitStatus(cwd);

  if (status.isRepo && !status.isDirty) return true;
  if (yes) return true;

  if (!status.isRepo) {
    ui.warn('This directory is not a git repository.');
    ui.dim('  Changes will be written in place with no automatic backup.');
  } else {
    ui.warn('Your git working tree has uncommitted changes.');
    ui.dim('  Commit or stash first so the transformation is easy to review/revert.');
  }

  const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
    { type: 'confirm', name: 'proceed', message: 'Proceed anyway?', default: false },
  ]);
  return proceed;
}

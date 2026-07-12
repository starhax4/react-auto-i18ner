import { execFile, execFileSync } from 'child_process';

/** True if `bin` is runnable (found on PATH). */
export function commandExists(bin: string): boolean {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  try {
    execFileSync(finder, [bin], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export interface RunResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

/** Spawn `bin args`, feed `input` on stdin, resolve with captured output. */
export function runProcess(
  bin: string,
  args: string[],
  options: { input?: string; timeoutMs?: number } = {}
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      bin,
      args,
      { timeout: options.timeoutMs ?? 120_000, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error(`Agent CLI "${bin}" not found`));
          return;
        }
        resolve({
          stdout: stdout ?? '',
          stderr: stderr ?? '',
          code: error?.code === undefined ? 0 : Number(error.code),
        });
      }
    );

    if (options.input !== undefined && child.stdin) {
      child.stdin.end(options.input);
    }
  });
}

import * as fs from 'fs-extra';
import * as path from 'path';
import { StackId } from '../config/schema';

export interface StackInfo {
  id: StackId;
  /** Human-readable reasons for the detection, shown in the wizard. */
  evidence: string[];
  /** Whether React itself is a dependency. */
  hasReact: boolean;
}

/**
 * Detect the UI stack from `package.json` dependencies and project layout.
 * The result is a *guess*: the wizard always lets the user confirm or override.
 */
export function detectStack(cwd = process.cwd()): StackInfo {
  const deps = readAllDeps(cwd);
  const evidence: string[] = [];
  const hasReact = 'react' in deps;

  if ('next' in deps) {
    evidence.push(`"next" dependency (${deps.next})`);
    if (fs.existsSync(path.join(cwd, 'app'))) {
      evidence.push('app/ directory present');
      return { id: 'next-app', evidence, hasReact };
    }
    if (fs.existsSync(path.join(cwd, 'pages'))) {
      evidence.push('pages/ directory present');
      return { id: 'next-pages', evidence, hasReact };
    }
    // Next without an obvious router dir defaults to App Router (13+).
    return { id: 'next-app', evidence, hasReact };
  }

  if ('vite' in deps) {
    evidence.push(`"vite" dependency (${deps.vite})`);
    return { id: 'vite', evidence, hasReact };
  }

  if ('react-scripts' in deps) {
    evidence.push(`"react-scripts" dependency (${deps['react-scripts']})`);
    return { id: 'cra', evidence, hasReact };
  }

  if (hasReact) evidence.push(`"react" dependency (${deps.react})`);
  else evidence.push('no framework dependency recognized');
  return { id: 'react-generic', evidence, hasReact };
}

function readAllDeps(cwd: string): Record<string, string> {
  const packageJsonPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return {};
  try {
    const pkg = fs.readJsonSync(packageJsonPath);
    return {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };
  } catch {
    return {};
  }
}

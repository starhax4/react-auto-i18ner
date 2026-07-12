import * as fs from 'fs-extra';
import * as path from 'path';
import { LibraryId, StackId } from '../config/schema';

export interface Recommendation {
  library: LibraryId;
  sourceDir: string;
  localesDir: string;
}

/**
 * Map a detected stack to sensible defaults: the conventional i18n library and
 * the source/locale directories that match that ecosystem's conventions.
 */
export function recommendFor(stack: StackId, cwd = process.cwd()): Recommendation {
  const sourceDir = detectSourceDir(cwd);

  switch (stack) {
    case 'next-app':
    case 'next-pages':
      // next-intl reads a message tree from ./messages by convention.
      return { library: 'next-intl', sourceDir, localesDir: './messages' };
    case 'vite':
    case 'cra':
    case 'react-generic':
    default:
      return {
        library: 'react-i18next',
        sourceDir,
        localesDir: `${trimSlash(sourceDir)}/locales`,
      };
  }
}

function detectSourceDir(cwd: string): string {
  if (fs.existsSync(path.join(cwd, 'src'))) return './src';
  if (fs.existsSync(path.join(cwd, 'app'))) return './app';
  return '.';
}

function trimSlash(dir: string): string {
  const cleaned = dir.replace(/\/+$/, '');
  return cleaned === '.' ? '.' : cleaned;
}

import * as t from '@babel/types';
import type { File } from '@babel/types';
import { I18nAdapter } from '../adapters/I18nAdapter';

/**
 * Ensure the library hook is imported. Adds the named specifier to an existing
 * import from the same module when possible, otherwise inserts a new import at
 * the top of the file. Idempotent: does nothing if the hook is already imported.
 */
export function ensureImport(ast: File, adapter: I18nAdapter): boolean {
  const program = ast.program;
  const imports = program.body.filter((n): n is t.ImportDeclaration =>
    t.isImportDeclaration(n)
  );

  const fromModule = imports.find(
    (imp) => imp.source.value === adapter.importSource
  );

  if (fromModule) {
    const alreadyImported = fromModule.specifiers.some(
      (spec) =>
        t.isImportSpecifier(spec) &&
        t.isIdentifier(spec.imported) &&
        spec.imported.name === adapter.hookName
    );
    if (alreadyImported) return false;

    fromModule.specifiers.push(
      t.importSpecifier(
        t.identifier(adapter.hookName),
        t.identifier(adapter.hookName)
      )
    );
    return true;
  }

  const insertAt = lastImportIndex(program.body) + 1;
  program.body.splice(insertAt, 0, adapter.buildImport());
  return true;
}

function lastImportIndex(body: t.Statement[]): number {
  let index = -1;
  for (let i = 0; i < body.length; i++) {
    if (t.isImportDeclaration(body[i])) index = i;
  }
  return index;
}

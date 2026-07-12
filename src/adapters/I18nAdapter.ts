import * as t from '@babel/types';
import { LibraryId } from '../config/schema';

/** Arguments for building a translation call. */
export interface TranslationCall {
  /** The translation key. */
  key: string;
  /** Interpolation variables, mapping placeholder name → expression node. */
  vars: Record<string, t.Expression>;
}

/**
 * A library adapter encapsulates every difference between supported i18n
 * libraries: which module to import, how the accessor is bound, what a
 * translation call looks like, and where locale files live.
 *
 * The transformation engine is written entirely against this interface, so
 * adding a new library is a matter of implementing one adapter and registering
 * it — no engine changes required.
 */
export interface I18nAdapter {
  readonly id: LibraryId;
  /** npm package the user must have installed (for setup hints). */
  readonly packageName: string;
  /** Module specifier the hook is imported from. */
  readonly importSource: string;
  /** Named import used to obtain the accessor (e.g. `useTranslation`). */
  readonly hookName: string;
  /** Local identifier bound to the translation function (e.g. `t`). */
  readonly accessorName: string;
  /** Separator that produces nested locale objects for this library. */
  readonly keySeparator: string;

  /** Build the translation call expression `t('key', { vars })`. */
  buildCallExpression(call: TranslationCall): t.CallExpression;

  /** Build the statement that binds the accessor inside a component body. */
  buildHookStatement(): t.Statement;

  /** Build the import declaration for the hook. */
  buildImport(): t.ImportDeclaration;

  /** Locale messages path for `locale`, relative to the configured localesDir. */
  localeRelativePath(locale: string): string;
}

/**
 * Shared builder for `t('key', { vars })`. All current adapters bind the
 * accessor to `t` and pass interpolation as a trailing object, so this covers
 * both; adapters may override if a future library differs.
 */
export function buildTranslationCall(
  accessorName: string,
  { key, vars }: TranslationCall
): t.CallExpression {
  const args: t.Expression[] = [t.stringLiteral(key)];

  const varNames = Object.keys(vars);
  if (varNames.length > 0) {
    const properties = varNames.map((name) =>
      t.objectProperty(
        isValidIdentifier(name) ? t.identifier(name) : t.stringLiteral(name),
        vars[name],
        false,
        // Use shorthand when the value is the identically-named identifier.
        isShorthand(name, vars[name])
      )
    );
    args.push(t.objectExpression(properties));
  }

  return t.callExpression(t.identifier(accessorName), args);
}

function isShorthand(name: string, value: t.Expression): boolean {
  return t.isIdentifier(value) && value.name === name;
}

function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

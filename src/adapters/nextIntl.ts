import * as t from '@babel/types';
import { parseStatements } from '../core/parse';
import {
  I18nAdapter,
  TranslationCall,
  buildTranslationCall,
} from './I18nAdapter';

/**
 * Adapter for `next-intl` — the dominant choice for the Next.js App Router.
 *
 * Accessor:  `const t = useTranslations();`
 * Call:      `t('key', { name })`
 * Import:    `import { useTranslations } from 'next-intl';`
 * Locales:   `<localesDir>/<locale>.json` (next-intl reads a message tree)
 */
export const nextIntlAdapter: I18nAdapter = {
  id: 'next-intl',
  packageName: 'next-intl',
  importSource: 'next-intl',
  hookName: 'useTranslations',
  accessorName: 't',
  keySeparator: '.',

  buildCallExpression(call: TranslationCall): t.CallExpression {
    return buildTranslationCall(this.accessorName, call);
  },

  buildHookStatement(): t.Statement {
    return parseStatements(`const t = ${this.hookName}();`)[0] as t.Statement;
  },

  buildImport(): t.ImportDeclaration {
    // Built (not parsed) so recast treats it as new and inserts proper newlines.
    return t.importDeclaration(
      [t.importSpecifier(t.identifier(this.hookName), t.identifier(this.hookName))],
      t.stringLiteral(this.importSource)
    );
  },

  localeRelativePath(locale: string): string {
    return `${locale}.json`;
  },
};

import * as t from '@babel/types';
import { parseStatements } from '../core/parse';
import {
  I18nAdapter,
  TranslationCall,
  buildTranslationCall,
} from './I18nAdapter';

/**
 * Adapter for `react-i18next` — the dominant choice for React/Vite/CRA apps.
 *
 * Accessor:  `const { t } = useTranslation();`
 * Call:      `t('key', { name })`
 * Import:    `import { useTranslation } from 'react-i18next';`
 * Locales:   `<localesDir>/<locale>.json` (nested via the `.` separator)
 */
export const reactI18nextAdapter: I18nAdapter = {
  id: 'react-i18next',
  packageName: 'react-i18next',
  importSource: 'react-i18next',
  hookName: 'useTranslation',
  accessorName: 't',
  keySeparator: '.',

  buildCallExpression(call: TranslationCall): t.CallExpression {
    return buildTranslationCall(this.accessorName, call);
  },

  buildHookStatement(): t.Statement {
    return parseStatements(`const { t } = ${this.hookName}();`)[0] as t.Statement;
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

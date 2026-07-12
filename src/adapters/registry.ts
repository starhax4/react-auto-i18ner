import { LibraryId } from '../config/schema';
import { I18nAdapter } from './I18nAdapter';
import { reactI18nextAdapter } from './reactI18next';
import { nextIntlAdapter } from './nextIntl';

const ADAPTERS: Record<LibraryId, I18nAdapter> = {
  'react-i18next': reactI18nextAdapter,
  'next-intl': nextIntlAdapter,
};

/** Resolve the adapter for a library id. */
export function getAdapter(id: LibraryId): I18nAdapter {
  const adapter = ADAPTERS[id];
  if (!adapter) {
    throw new Error(`No adapter registered for library "${id}"`);
  }
  return adapter;
}

/** All registered adapters (for listing in the wizard/help). */
export function allAdapters(): I18nAdapter[] {
  return Object.values(ADAPTERS);
}

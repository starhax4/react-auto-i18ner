import * as path from 'path';
import { KeyStrategyId } from '../config/schema';
import { KeyContext, KeyProposer } from './KeyRegistry';

/** Max words used from the source text when building a leaf key segment. */
const MAX_LEAF_WORDS = 6;

/**
 * Default strategy: `Namespace.leaf`, where the namespace comes from the
 * component (or file) and the leaf is a camelCase slug of the text. Produces
 * nested locale objects and never collides across components.
 */
const pathNamespaceProposer: KeyProposer = (ctx) => {
  const namespace = namespaceFor(ctx);
  const leaf = camelCaseSlug(ctx.text);
  return `${namespace}.${leaf}`;
};

/** Single-level camelCase slug of the text, with no namespace. */
const flatProposer: KeyProposer = (ctx) => camelCaseSlug(ctx.text);

/** Resolve a deterministic {@link KeyProposer} for a strategy id. */
export function proposerFor(strategy: KeyStrategyId): KeyProposer {
  // The AI strategy uses the path proposer as its offline fallback; the AI
  // layer overrides keys before they reach the registry when available.
  switch (strategy) {
    case 'flat':
      return flatProposer;
    case 'path':
    case 'ai':
    default:
      return pathNamespaceProposer;
  }
}

function namespaceFor(ctx: KeyContext): string {
  if (ctx.componentName) return ctx.componentName;
  const base = path.basename(ctx.filePath).replace(/\.[^.]+$/, '');
  return toPascalCase(base) || 'Common';
}

/** Strip interpolation, keep the first few words, join as camelCase. */
function camelCaseSlug(text: string): string {
  const words = text
    .replace(/\{\{[^}]*\}\}/g, ' ') // drop {{var}} placeholders
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_LEAF_WORDS);

  if (words.length === 0) return 'text';

  return words
    .map((word, i) => (i === 0 ? word : capitalize(word)))
    .join('');
}

function toPascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(capitalize)
    .join('');
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

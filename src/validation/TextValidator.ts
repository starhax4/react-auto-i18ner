import { Config } from '../config/schema';

/**
 * Decides whether a string is user-facing text worth translating.
 *
 * The AST engine only ever hands this validator real JSX text and attribute
 * values, so the heuristics here are intentionally lean — they guard against
 * the handful of non-translatable strings that legitimately appear in those
 * positions (CSS classes, URLs, numbers, symbols, single tokens) rather than
 * trying to re-detect code fragments the parser has already excluded.
 */
export class TextValidator {
  private readonly minLength: number;
  private readonly maxLength: number;
  private readonly skipPatterns: RegExp[];

  constructor(config: Pick<Config, 'validation'>) {
    this.minLength = config.validation.minLength;
    this.maxLength = config.validation.maxLength;
    this.skipPatterns = compilePatterns(config.validation.skipPatterns);
  }

  /** Returns true when `text` should be extracted for translation. */
  isTranslatable(text: string): boolean {
    const clean = text.trim();

    if (clean.length < this.minLength || clean.length > this.maxLength) {
      return false;
    }

    // Must contain at least one letter in any script (Latin, Cyrillic, Greek,
    // Arabic, CJK, …) so non-Latin source copy is still extracted.
    if (!/\p{L}/u.test(clean)) return false;

    // Pure symbols/punctuation.
    if (/^[^\p{L}\p{N}\s]+$/u.test(clean)) return false;

    // Numbers (with optional unit/currency) — not translatable copy.
    if (/^[$€£¥]?\d[\d.,]*\s*(px|em|rem|vh|vw|%|deg|ms|s)?$/i.test(clean)) {
      return false;
    }

    if (TECHNICAL_TERMS.has(clean.toLowerCase())) return false;
    if (isCssClassList(clean)) return false;
    if (isUrlOrPath(clean)) return false;

    // A single lowercase token is almost always an identifier/keyword, not copy.
    if (/^[a-z][\w-]*$/.test(clean)) return false;

    for (const pattern of this.skipPatterns) {
      if (pattern.test(clean)) return false;
    }

    return true;
  }
}

function compilePatterns(patterns: string[]): RegExp[] {
  const compiled: RegExp[] = [];
  for (const source of patterns) {
    try {
      compiled.push(new RegExp(source));
    } catch {
      // A malformed user pattern is ignored rather than crashing the run.
    }
  }
  return compiled;
}

function isCssClassList(text: string): boolean {
  // e.g. "bg-blue-500 text-sm", "flex items-center"
  return /^(?:[a-z][\w-]*:)?[a-z][\w-]*(?:\s+(?:[a-z][\w-]*:)?[a-z][\w-]*)*$/.test(
    text
  )
    ? /(^|\s)(bg-|text-|border-|rounded-|flex|grid|px-|py-|mx-|my-|w-|h-|gap-|items-|justify-)/.test(
        text
      )
    : false;
}

function isUrlOrPath(text: string): boolean {
  if (/^https?:\/\//.test(text) || /^www\./.test(text)) return true;
  if (/^[./~]/.test(text) || /^[a-zA-Z]:[\\/]/.test(text)) return true;
  // A filename with a code-ish extension.
  if (/\.(?:tsx?|jsx?|json|css|scss|svg|png|jpe?g|gif|webp)$/i.test(text)) {
    return true;
  }
  return false;
}

/** Tokens that appear as JSX text/attributes but are never user copy. */
const TECHNICAL_TERMS = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'nan',
  'auto',
  'none',
  'inherit',
  'initial',
  'unset',
  'submit',
  'button',
  'reset',
  'get',
  'post',
  'put',
  'delete',
  'patch',
]);

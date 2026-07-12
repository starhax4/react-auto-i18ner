/**
 * Extract the first JSON value from an agent's stdout.
 *
 * Agents often wrap JSON in prose or ```json fences, so we strip fences and
 * then scan for the first balanced `{…}` or `[…]`. Returns null when no valid
 * JSON is found — callers treat that as "AI unavailable" and fall back.
 */
export function extractJson<T = unknown>(text: string): T | null {
  const unfenced = text.replace(/```(?:json)?/gi, '');
  const start = firstBraceOrBracket(unfenced);
  if (start === -1) return null;

  const open = unfenced[start];
  const close = open === '{' ? '}' : ']';
  const end = matchingClose(unfenced, start, open, close);
  if (end === -1) return null;

  try {
    return JSON.parse(unfenced.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

function firstBraceOrBracket(text: string): number {
  const brace = text.indexOf('{');
  const bracket = text.indexOf('[');
  if (brace === -1) return bracket;
  if (bracket === -1) return brace;
  return Math.min(brace, bracket);
}

/** Find the index of the balanced close, ignoring braces inside strings. */
function matchingClose(
  text: string,
  start: number,
  open: string,
  close: string
): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === open) depth++;
    else if (char === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

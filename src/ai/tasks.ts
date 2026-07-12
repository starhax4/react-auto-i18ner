import { AiAgent } from './AiAgent';
import { extractJson } from './json';

/** An item whose key we want the agent to name. */
export interface KeyNamingItem {
  text: string;
  componentName?: string;
}

/** An item to translate. */
export interface TranslationItem {
  key: string;
  text: string;
}

/**
 * Ask the agent to propose semantic, nested keys for each text.
 * Returns a `text → key` map; on any failure returns an empty map so the caller
 * keeps its deterministic keys.
 */
export async function aiNameKeys(
  agent: AiAgent,
  items: KeyNamingItem[]
): Promise<Map<string, string>> {
  if (items.length === 0) return new Map();

  const indexed = items.map((item, i) => ({ i, ...item }));
  const prompt = [
    'You are naming i18n translation keys for a React app.',
    'For each item, return a concise, nested, dot-separated key using the',
    'component as the namespace, e.g. "LoginForm.submitButton". Use camelCase',
    'segments. Do not translate the text; only name the key.',
    'Respond with ONLY a JSON object mapping each item index to its key.',
    'Example: {"0":"LoginForm.title","1":"LoginForm.submit"}',
    '',
    JSON.stringify(indexed),
  ].join('\n');

  const parsed = await ask<Record<string, unknown>>(agent, prompt);
  if (!parsed) return new Map();

  const result = new Map<string, string>();
  for (const item of indexed) {
    const key = parsed[String(item.i)];
    if (typeof key === 'string' && isValidKey(key)) {
      result.set(item.text, key);
    }
  }
  return result;
}

/**
 * Ask the agent to translate texts into `targetLocale`.
 * Returns a `key → translation` map; empty on failure.
 */
export async function aiTranslate(
  agent: AiAgent,
  sourceLocale: string,
  targetLocale: string,
  items: TranslationItem[]
): Promise<Map<string, string>> {
  if (items.length === 0) return new Map();

  const indexed = items.map((item, i) => ({ i, text: item.text }));
  const prompt = [
    `Translate UI strings from ${sourceLocale} to ${targetLocale}.`,
    'Preserve any {{placeholders}} exactly. Keep translations natural and concise.',
    'Respond with ONLY a JSON object mapping each item index to its translation.',
    'Example: {"0":"Guardar","1":"Cancelar"}',
    '',
    JSON.stringify(indexed),
  ].join('\n');

  const parsed = await ask<Record<string, unknown>>(agent, prompt);
  if (!parsed) return new Map();

  const result = new Map<string, string>();
  items.forEach((item, i) => {
    const value = parsed[String(i)];
    if (typeof value === 'string' && value.trim() !== '') {
      result.set(item.key, value);
    }
  });
  return result;
}

async function ask<T>(agent: AiAgent, prompt: string): Promise<T | null> {
  try {
    const output = await agent.run(prompt);
    return extractJson<T>(output);
  } catch {
    return null;
  }
}

function isValidKey(key: string): boolean {
  return /^[A-Za-z0-9_$]+(\.[A-Za-z0-9_$]+)*$/.test(key);
}

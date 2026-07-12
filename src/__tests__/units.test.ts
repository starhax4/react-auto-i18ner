import { AiAgent } from '../ai/AiAgent';
import { extractJson } from '../ai/json';
import { aiNameKeys, aiTranslate } from '../ai/tasks';
import { KeyRegistry } from '../keys/KeyRegistry';
import { proposerFor } from '../keys/proposers';
import { TextValidator } from '../validation/TextValidator';
import { configSchema } from '../config/schema';
import { flatten, getNested, setNested } from '../locales/tree';

const validator = () => new TextValidator(configSchema.parse({}));

describe('TextValidator', () => {
  const v = validator();
  it('accepts real UI copy', () => {
    expect(v.isTranslatable('Save changes')).toBe(true);
    expect(v.isTranslatable('Welcome back!')).toBe(true);
  });
  it('rejects non-copy strings', () => {
    expect(v.isTranslatable('bg-blue-500 text-sm')).toBe(false);
    expect(v.isTranslatable('https://example.com')).toBe(false);
    expect(v.isTranslatable('123')).toBe(false);
    expect(v.isTranslatable('42px')).toBe(false);
    expect(v.isTranslatable('submit')).toBe(false);
    expect(v.isTranslatable('a')).toBe(false);
    expect(v.isTranslatable('onClick')).toBe(false);
  });
});

describe('key proposers', () => {
  it('path strategy builds nested component keys', () => {
    const reg = new KeyRegistry(proposerFor('path'));
    const key = reg.keyFor({
      text: 'Save changes',
      componentName: 'LoginForm',
      filePath: '/a/LoginForm.tsx',
    });
    expect(key).toBe('LoginForm.saveChanges');
  });
  it('flat strategy builds single-level slugs', () => {
    const reg = new KeyRegistry(proposerFor('flat'));
    expect(reg.keyFor({ text: 'Save changes', filePath: '/a/x.tsx' })).toBe(
      'saveChanges'
    );
  });
  it('dedupes identical text and disambiguates collisions', () => {
    const reg = new KeyRegistry(proposerFor('flat'));
    const a = reg.keyFor({ text: 'Go', filePath: '/x.tsx' });
    const again = reg.keyFor({ text: 'Go', filePath: '/x.tsx' });
    expect(again).toBe(a); // dedup by text
    reg.seed('Go now', 'go'); // force a collision on the base slug
    const c = reg.keyFor({ text: 'Go!', filePath: '/x.tsx' });
    expect(c).not.toBe('go');
  });
});

describe('locale tree helpers', () => {
  it('sets and reads nested values', () => {
    const tree = {};
    setNested(tree, ['A', 'b', 'c'], 'x', true);
    expect(getNested(tree, ['A', 'b', 'c'])).toBe('x');
    expect(flatten(tree, '.')).toEqual([['A.b.c', 'x']]);
  });
  it('does not overwrite when overwrite=false', () => {
    const tree = { A: { b: 'keep' } };
    setNested(tree, ['A', 'b'], 'new', false);
    expect(getNested(tree, ['A', 'b'])).toBe('keep');
  });
});

describe('config schema', () => {
  it('fills defaults from an empty object', () => {
    const c = configSchema.parse({});
    expect(c.library).toBe('react-i18next');
    expect(c.keyStrategy).toBe('path');
    expect(c.targetLocales).toEqual(['es', 'fr', 'de']);
  });
  it('rejects unknown keys and bad locale codes', () => {
    expect(() => configSchema.parse({ nope: 1 })).toThrow();
    expect(() => configSchema.parse({ sourceLocale: 'english' })).toThrow();
  });
});

describe('extractJson', () => {
  it('parses fenced JSON', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('parses JSON embedded in prose', () => {
    expect(extractJson('Sure! {"0":"x"} done')).toEqual({ '0': 'x' });
  });
  it('returns null on garbage', () => {
    expect(extractJson('no json here')).toBeNull();
  });
  it('ignores braces inside strings', () => {
    expect(extractJson('{"a":"}{"}')).toEqual({ a: '}{' });
  });
});

/** A scripted agent for deterministic AI-layer tests. */
class MockAgent implements AiAgent {
  readonly id = 'claude' as const;
  constructor(private readonly reply: string | (() => never)) {}
  isAvailable() {
    return true;
  }
  async run(): Promise<string> {
    if (typeof this.reply === 'function') return this.reply();
    return this.reply;
  }
}

describe('AI tasks', () => {
  it('maps AI-named keys back by text', async () => {
    const agent = new MockAgent('{"0":"Home.title","1":"Home.subtitle"}');
    const result = await aiNameKeys(agent, [
      { text: 'Title' },
      { text: 'Subtitle' },
    ]);
    expect(result.get('Title')).toBe('Home.title');
    expect(result.get('Subtitle')).toBe('Home.subtitle');
  });

  it('falls back to an empty map when the agent fails', async () => {
    const agent = new MockAgent(() => {
      throw new Error('boom');
    });
    const result = await aiNameKeys(agent, [{ text: 'Title' }]);
    expect(result.size).toBe(0);
  });

  it('translates by index and preserves keys', async () => {
    const agent = new MockAgent('{"0":"Guardar"}');
    const result = await aiTranslate(agent, 'en', 'es', [
      { key: 'A.save', text: 'Save' },
    ]);
    expect(result.get('A.save')).toBe('Guardar');
  });
});

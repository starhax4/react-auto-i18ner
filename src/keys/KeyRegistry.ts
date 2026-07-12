/** Context a key proposer uses to derive a base key for a piece of text. */
export interface KeyContext {
  /** User-facing text (may contain `{{var}}` placeholders). */
  text: string;
  /** Enclosing component name, when known. */
  componentName?: string;
  /** Absolute file path the text came from. */
  filePath: string;
}

/** Proposes a (not-necessarily-unique) base key for a piece of text. */
export type KeyProposer = (ctx: KeyContext) => string;

/**
 * Assigns stable, unique translation keys.
 *
 * Two responsibilities kept separate from key *shape*:
 *  - **Dedup by text**: identical source text always maps to one key.
 *  - **Collision handling**: distinct texts that propose the same base key get
 *    numeric suffixes, so keys are guaranteed unique across the whole run.
 */
export class KeyRegistry {
  private readonly byText = new Map<string, string>();
  private readonly used = new Set<string>();

  constructor(private readonly propose: KeyProposer) {}

  /** Seed a pre-existing text→key mapping (e.g. from prior locale files). */
  seed(text: string, key: string): void {
    if (!this.byText.has(text)) {
      this.byText.set(text, key);
      this.used.add(key);
    }
  }

  /** Return the key for `ctx.text`, creating a unique one on first sight. */
  keyFor(ctx: KeyContext): string {
    const existing = this.byText.get(ctx.text);
    if (existing) return existing;

    const base = this.propose(ctx) || 'key';
    let key = base;
    let suffix = 2;
    while (this.used.has(key)) {
      key = `${base}_${suffix++}`;
    }

    this.used.add(key);
    this.byText.set(ctx.text, key);
    return key;
  }
}

# Architecture

This document explains how `react-auto-i18ner` works internally — the design,
the data flow, and the trade-offs behind each decision. It doubles as a study
guide: every section ends with the "why" you'd want to be able to explain.

---

## 1. What the tool does

Given a React/TypeScript codebase, it:

1. Finds component files.
2. Rewrites user-facing JSX text and attributes into translation calls
   (`t('key')`), building **interpolation** for text mixed with `{expr}`.
3. Injects the translation hook and import into each affected component.
4. Generates **nested** locale JSON (source language filled, targets stubbed).
5. Optionally uses a locally-installed **AI agent** to name keys semantically
   and translate target languages.

The whole thing is one deterministic engine; AI is an optional layer on top.

---

## 2. The core idea: AST, not regex

The previous version transformed source with regular expressions
(`/>([^<>{]+)</g`). That is fundamentally unsafe: a regex can't tell JSX text
from a string literal, a comparison operator (`a > b`), or a comment, so it
wrapped non-text in `t()` and produced broken code. It also couldn't handle
multi-line text or `{interpolation}`.

v2 parses each file into an **Abstract Syntax Tree** and operates on real nodes:

```
source ──▶ recast.parse (babel-ts) ──▶ AST ──▶ traverse & mutate ──▶ recast.print ──▶ source
```

- **`@babel/parser`** (via recast's `babel-ts` preset) parses JS, TS and JSX
  uniformly — one code path for every file type.
- **`@babel/traverse`** walks the tree; we only ever see structural nodes
  (`JSXText`, `JSXAttribute`, `JSXExpressionContainer`), so a `>` inside a
  string or a `3 > 2` comparison is simply never a candidate. The class of
  false-positives the old tool produced is impossible by construction.
- **recast** preserves the original formatting and reprints **only the nodes we
  changed**, so diffs stay small and the file keeps its own style.

> **Why recast over `@babel/generator`?** Babel's generator reprints the entire
> file, reformatting untouched code. recast diff-prints, which is what you want
> for a codemod that edits real repositories.

---

## 3. Layered structure

Dependencies point inward. Outer layers (CLI) depend on inner layers (core);
inner layers never import outward. Libraries and AI agents sit behind
interfaces so the engine doesn't know which one is active.

```
src/
  cli/          commander commands + interactive wizard (thin)
  ai/           optional AI-agent layer (detect CLI, run prompt, parse JSON)
  stack/        detect UI stack (vite/cra/next) + recommend defaults
  core/         the engine: parse, transform, inject, orchestrate
  adapters/     i18n library strategies (react-i18next, next-intl)
  keys/         translation-key generation strategies
  locales/      nested locale file read/merge/write
  validation/   "is this string user-facing copy?"
  config/       zod schema + load/merge/validate
```

Each file has one responsibility. `core/transformJsx.ts` decides *what* to
rewrite; `adapters/*` decide *how* the target library expresses it;
`keys/*` decide what the key is called; `locales/*` decide how files are laid
out. None of them know about each other's internals.

---

## 4. Data flow of a run

`core/Pipeline.ts` orchestrates:

```
findFiles (fast-glob)
  └─ for each file:
       transformSource(code):                    core/transformFile.ts
         parse(code)                              core/parse.ts
         transformJsx(ast)  ── uses adapter,      core/transformJsx.ts
                               validator, keys
         injectHooks(targets)                     core/injectHook.ts
         ensureImport(ast)                        core/imports.ts
         print(ast)
  collect key → text map
buildLocaleWrites(keys)                           locales/LocaleWriter.ts
  (dry-run stops here; otherwise commit)
```

Planning is fully separated from writing: a **dry run** builds the exact same
`RunResult` (file edits + planned locale writes) and simply skips the final
commit. That's why `--dry-run` is trustworthy — it runs the real logic, it just
doesn't call `writeFile`.

---

## 5. The transform visitor (`core/transformJsx.ts`)

For each JSX element/fragment it looks at the **children as a group**:

- **Merge path (interpolation).** If the children are text possibly interleaved
  with *simple* expressions (`{name}`, `{user.name}`), it folds them into one
  message: `Welcome back, {{name}}!` plus a vars object `{ name: user.name }`,
  emitting `t('Greeting.welcomeBack', { name: user.name })`. The `{{name}}`
  message becomes the locale value.
- **Fallback path.** If children contain nested elements or complex expressions
  (calls, ternaries), it wraps each standalone text run on its own and leaves
  everything else untouched.

Attributes (`placeholder`, `title`, `alt`, `aria-label`, configurable) with a
string-literal value are rewritten to `attr={t('key')}`.

**Idempotency** falls out of the design: after transformation a wrapped element
contains a `JSXExpressionContainer`, not `JSXText`, so a second run finds no
candidates and changes nothing. Re-running is always a no-op. (Verified by test
and by the end-to-end check.)

### Component detection

To place the hook correctly, the visitor finds the **enclosing component** by
walking ancestors and preferring the *outermost capitalized function*. This is
what stops `items.map(item => <li/>)` callbacks from being treated as
components — the hook goes on the component, not the callback.

Class components are detected and **skipped with a warning** rather than
half-transformed. This is deliberate honesty: the old tool claimed class support
but its implementation was an empty `console.log`.

---

## 6. Hook & import injection

`core/injectHook.ts`:

- Block-bodied function/arrow → prepend the hook statement.
- **Expression-bodied arrow** (`const C = () => <div/>`) → convert to a block
  with an explicit `return`, *then* prepend the hook. This fixes a real bug in
  the old engine, which wrapped such components' text but never bound `t`,
  producing `t is not defined` at runtime.

`core/imports.ts` adds the hook import (or a specifier to an existing import),
idempotently.

---

## 7. Strategy pattern #1 — i18n library adapters (`adapters/`)

The engine is written entirely against the `I18nAdapter` interface:

```ts
interface I18nAdapter {
  buildCallExpression(call): CallExpression;   // t('key', { vars })
  buildHookStatement(): Statement;             // const { t } = useTranslation()
  buildImport(): ImportDeclaration;
  localeRelativePath(locale): string;
  keySeparator: string;
  // …
}
```

`react-i18next` binds `const { t } = useTranslation()`; `next-intl` binds
`const t = useTranslations()`. Same engine, different adapter. **Adding a new
library is one new adapter + one registry line — zero engine changes.** That's
the payoff of the abstraction.

---

## 8. Strategy pattern #2 — key generation (`keys/`)

`KeyRegistry` handles two concerns independent of key *shape*: dedup by text
(same text → same key) and collision handling (distinct texts proposing the
same base key get numeric suffixes). A pluggable **proposer** decides the shape:

- `path` (default): `Component.leafCamelCase`, e.g. `LoginForm.submitButton`,
  producing **nested** locale objects. Predictable and collision-free.
- `flat`: single-level slug.
- `ai`: proposer defers to the AI layer, falling back to `path` offline.

---

## 9. Nested locale files (`locales/`)

`LocaleWriter` turns the flat `key → text` map into a nested tree using the
adapter's separator (`.`), matching how both react-i18next and next-intl read
messages. The **source** locale is authoritative (values = source text); each
**target** locale is *merged* — existing translations are preserved, only
missing keys are added as empty strings. Re-runs never destroy translator work.

---

## 10. Git-aware safety (`core/gitGuard.ts`)

The old tool copied the entire source tree into `i18n-backup/` on every run —
slow, cluttering, and redundant with version control. v2 removes that entirely.
Instead it inspects the working tree: with a clean git tree it proceeds
silently (every change is `git diff`-able and `git checkout`-revertable); with a
dirty or non-git tree it warns and asks (unless `--yes`). `--dry-run` is the
preview path. **The tool never copies your code.**

---

## 11. The AI layer (`ai/`) — optional, strategy pattern #3

`AiAgent` is a tiny interface: `isAvailable()` and `run(prompt) → string`.
Concrete agents (`claude`, `cursor`, `gemini`, `aider`) are declarative specs
describing how to invoke each CLI in one-shot mode. The tool uses **whatever
agent the developer already has** — no API keys of its own.

Tasks (`ai/tasks.ts`):
- **nameKeys** — propose semantic nested keys. Runs as a dry-run pre-pass that
  collects texts, asks the agent, and seeds the `KeyRegistry` with the answers.
- **translate** — fill empty target-locale entries.

Every AI call is best-effort: the JSON is extracted defensively
(`ai/json.ts` scans for a balanced object, ignoring braces in strings) and
validated; **any failure falls back to the deterministic path**. The tool works
fully offline.

---

## 12. Configuration (`config/`)

A single **zod** schema is the source of truth; the TS `Config` type is inferred
from it. `loadConfig` merges defaults → config file → CLI overrides and
validates once. (The old `loadConfig` had a bug where it discarded the loaded
user config by overwriting it with defaults — fixed and regression-tested.)

---

## 13. Testing

- **Golden transform tests** assert real behavior: interpolation,
  expression-arrow conversion, multiple components, attributes, class-skip,
  idempotency, and **negative cases** (comparison operators / string literals /
  util functions left untouched) — the exact failures the old regex caused.
- **Unit tests** for validator, key proposers, tree helpers, config schema,
  JSON extraction, and AI tasks (with a mocked agent + fallback assertion).
- **Filesystem tests** for `loadConfig` (the regression), dry-run-writes-nothing,
  real run + nested output + idempotency, and stack detection.

---

## 14. Known limitations

- **Output formatting.** recast prints newly-built nodes (e.g. an interpolation
  vars object) in its own style. The output is valid but not fully formatted —
  run your project's Prettier/ESLint afterwards, as is standard for codemods.
- **Class components** are skipped with a warning (no `withTranslation` codemod
  yet).
- **AI agent invocation** assumes a one-shot/headless flag per CLI; exact flags
  can drift as those tools evolve, so results are always treated as best-effort.

---

## 15. Interview cheat-sheet

- *Why AST over regex?* Structural correctness — you physically cannot match a
  comparison operator or string literal as JSX text; interpolation and
  multi-line text become tractable.
- *Why recast?* Formatting-preserving, diff-only reprinting.
- *How is it idempotent?* Wrapped nodes are no longer `JSXText`, so re-runs find
  nothing to do.
- *How do you support multiple i18n libraries?* Adapter (strategy) pattern — the
  engine depends only on an interface.
- *How does AI fit without becoming a hard dependency?* An optional strategy
  layer with a deterministic fallback on every path.
- *Biggest correctness fix?* Expression-body arrows: the old tool wrapped their
  text without binding `t`; v2 converts them to block bodies first.

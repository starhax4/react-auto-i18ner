import { nextIntlAdapter } from '../adapters/nextIntl';
import { transform } from './helpers';

describe('transformJsx (react-i18next)', () => {
  it('wraps JSX text and injects the hook + import', () => {
    const out = transform(`
      export function App() {
        return <h1>Welcome to our App</h1>;
      }
    `);

    expect(out.changed).toBe(true);
    expect(out.hookInjected).toBe(true);
    expect(out.importAdded).toBe(true);
    expect(out.code).toMatch(/import \{ useTranslation \} from ["']react-i18next["']/);
    expect(out.code).toMatch(/const \{\s*t\s*\} = useTranslation\(\)/);
    expect(out.code).toMatch(/\{t\(['"]App\.welcomeToOurApp['"]\)\}/);
    expect(out.extractions[0].text).toBe('Welcome to our App');
  });

  it('translates whitelisted attributes', () => {
    const out = transform(`
      export function Field() {
        return <input placeholder="Enter your name" />;
      }
    `);
    expect(out.code).toMatch(/placeholder=\{t\(['"]Field\.enterYourName['"]\)\}/);
  });

  it('builds interpolation for text mixed with simple expressions', () => {
    const out = transform(`
      export function Greeting({ user }) {
        return <p>Welcome back, {user.name}!</p>;
      }
    `);
    // The call passes the KEY plus the interpolation vars…
    expect(out.code).toMatch(
      /t\(["']Greeting\.welcomeBack["'],\s*\{[\s\S]*name:\s*user\.name[\s\S]*\}\)/
    );
    // …and the {{name}} message is captured as the locale value.
    expect(
      out.extractions.find((e) => e.text === 'Welcome back, {{name}}!')
    ).toBeTruthy();
  });

  it('converts an expression-bodied arrow into a block with the hook', () => {
    const out = transform(`
      export const Badge = () => <span>New</span>;
    `);
    expect(out.code).toMatch(/const \{\s*t\s*\} = useTranslation\(\)/);
    expect(out.code).toContain('return');
    expect(out.code).toMatch(/\{t\(['"]Badge\.new['"]\)\}/);
  });

  it('injects a hook into every component in a file', () => {
    const out = transform(`
      export function A() { return <div>First message</div>; }
      export function B() { return <div>Second message</div>; }
    `);
    const hookCount = (out.code.match(/useTranslation\(\)/g) ?? []).length;
    expect(hookCount).toBe(2);
    expect(out.hookInjected).toBe(true);
  });

  it('does not treat map callbacks as components', () => {
    const out = transform(`
      export function List({ items }) {
        return <ul>{items.map((i) => <li key={i.id}>Static label</li>)}</ul>;
      }
    `);
    // Exactly one hook, placed in List (not the map callback).
    expect((out.code.match(/useTranslation\(\)/g) ?? []).length).toBe(1);
    expect(out.code).toContain('items.map');
  });

  it('skips class components and warns', () => {
    const out = transform(`
      import React from 'react';
      export class Old extends React.Component {
        render() { return <div>Legacy text here</div>; }
      }
    `);
    expect(out.changed).toBe(false);
    expect(out.warnings.join(' ')).toMatch(/class component/i);
  });

  it('is idempotent — a second run changes nothing', () => {
    const source = `
      export function App() {
        return (
          <div>
            <h1>Dashboard title</h1>
            <input placeholder="Search here" />
          </div>
        );
      }
    `;
    const first = transform(source);
    expect(first.changed).toBe(true);
    const second = transform(first.code);
    expect(second.changed).toBe(false);
    expect(second.code).toBe(first.code);
  });

  it('leaves non-JSX text untouched (no regex false positives)', () => {
    const out = transform(`
      export function Calc({ a, b }) {
        const label = "plain string literal";
        const ok = a > b && b < a;
        return <div>{ok ? label : label}</div>;
      }
    `);
    // Nothing here is real JSX copy, so no transformation occurs.
    expect(out.changed).toBe(false);
    expect(out.code).not.toContain('useTranslation');
  });
});

describe('adapter differences (next-intl)', () => {
  it('uses useTranslations and a plain const binding', () => {
    const out = transform(
      `export function App() { return <h1>Hello world</h1>; }`,
      { adapter: nextIntlAdapter }
    );
    expect(out.code).toMatch(/import \{ useTranslations \} from ["']next-intl["']/);
    expect(out.code).toContain('const t = useTranslations();');
    expect(out.code).not.toContain('{ t } = useTranslations');
  });
});

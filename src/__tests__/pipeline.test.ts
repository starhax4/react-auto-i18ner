import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { loadConfig } from '../config/loadConfig';
import { Pipeline } from '../core/Pipeline';
import { configSchema } from '../config/schema';
import { detectStack } from '../stack/detectStack';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rai18-'));
});
afterEach(() => {
  fs.removeSync(tmp);
});

function write(rel: string, contents: string): void {
  const full = path.join(tmp, rel);
  fs.ensureDirSync(path.dirname(full));
  fs.writeFileSync(full, contents);
}

describe('loadConfig', () => {
  it('honours a discovered config file (regression: was overwritten by defaults)', () => {
    write(
      'react-auto-i18ner.config.json',
      JSON.stringify({ localesDir: './custom-locales', targetLocales: ['es'] })
    );
    const config = loadConfig({ cwd: tmp });
    expect(config.localesDir).toBe('./custom-locales');
    expect(config.targetLocales).toEqual(['es']);
  });

  it('applies overrides on top of the file', () => {
    write('react-auto-i18ner.config.json', JSON.stringify({ localesDir: './a' }));
    const config = loadConfig({ cwd: tmp, overrides: { localesDir: './b' } });
    expect(config.localesDir).toBe('./b');
  });

  it('throws a ConfigError for an explicit missing path', () => {
    expect(() => loadConfig({ cwd: tmp, configPath: './nope.json' })).toThrow(
      /not found/i
    );
  });
});

describe('detectStack', () => {
  it('detects a Vite React app', () => {
    write('package.json', JSON.stringify({ devDependencies: { vite: '5', react: '18' } }));
    expect(detectStack(tmp).id).toBe('vite');
  });
  it('detects Next.js App Router', () => {
    write('package.json', JSON.stringify({ dependencies: { next: '14', react: '18' } }));
    write('app/page.tsx', 'export default function Page(){return null}');
    expect(detectStack(tmp).id).toBe('next-app');
  });
});

describe('Pipeline end-to-end', () => {
  const config = () =>
    configSchema.parse({
      sourceDir: './src',
      localesDir: './locales',
      targetLocales: ['es'],
      generateTypeDefs: false,
    });

  beforeEach(() => {
    write(
      'src/App.tsx',
      `export function App() { return <h1>Welcome home</h1>; }`
    );
  });

  it('dry-run writes nothing', async () => {
    const result = await new Pipeline(config()).run({ cwd: tmp, dryRun: true });
    expect(result.stats.filesChanged).toBe(1);
    expect(fs.existsSync(path.join(tmp, 'locales'))).toBe(false);
    // Source file untouched.
    expect(fs.readFileSync(path.join(tmp, 'src/App.tsx'), 'utf8')).not.toContain(
      'useTranslation'
    );
  });

  it('real run transforms source and writes nested locales; re-run is a no-op', async () => {
    const first = await new Pipeline(config()).run({ cwd: tmp });
    expect(first.stats.filesChanged).toBe(1);

    const src = fs.readFileSync(path.join(tmp, 'src/App.tsx'), 'utf8');
    expect(src).toContain('useTranslation');
    expect(src).toMatch(/t\(['"]App\.welcomeHome['"]\)/);

    const en = fs.readJsonSync(path.join(tmp, 'locales/en.json'));
    expect(en).toEqual({ App: { welcomeHome: 'Welcome home' } });

    const es = fs.readJsonSync(path.join(tmp, 'locales/es.json'));
    expect(es).toEqual({ App: { welcomeHome: '' } }); // placeholder for translation

    const second = await new Pipeline(config()).run({ cwd: tmp });
    expect(second.stats.filesChanged).toBe(0);
  });

  it('preserves existing target translations across runs', async () => {
    await new Pipeline(config()).run({ cwd: tmp });
    fs.writeJsonSync(path.join(tmp, 'locales/es.json'), {
      App: { welcomeHome: 'Bienvenido a casa' },
    });
    await new Pipeline(config()).run({ cwd: tmp });
    const es = fs.readJsonSync(path.join(tmp, 'locales/es.json'));
    expect(es.App.welcomeHome).toBe('Bienvenido a casa');
  });
});

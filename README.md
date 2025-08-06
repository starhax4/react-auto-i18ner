# React Auto i18ner

🚀 **Automated React i18n transformation tool** that extracts texts, creates translation files, and transforms JSX components end-to-end.

**✨ Works with both JavaScript and TypeScript projects!**

**🎯 One Command - Zero Configuration: `npx react-auto-i18ner`**

[![npm version](https://badge.fury.io/js/react-auto-i18ner.svg)](https://badge.fury.io/js/react-auto-i18ner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎯 **Automated Text Extraction**: Intelligently extracts translatable text from JSX components
- 🔄 **Smart Transformation**: Automatically wraps text with translation functions
- 📦 **Hook Management**: Adds `useTranslation` hooks where needed
- 🧹 **Code Fragment Filtering**: Filters out code fragments and technical terms
- 🎨 **Multiple Component Types**: Supports function, arrow, and class components
- 📝 **Translation File Generation**: Creates clean, organized translation files
- 🔧 **Highly Configurable**: Extensive configuration options for different project needs
- 🛡️ **TypeScript Support**: Full TypeScript support with generated type definitions
- 🟨 **JavaScript Support**: Works seamlessly with pure JavaScript/JSX projects
- 🔍 **Auto Detection**: Automatically detects project type (TS/JS) and uses appropriate strategy
- 💾 **Backup System**: Optional backup creation before transformation
- 🎨 **CLI & Programmatic**: Use via CLI or integrate into your build process

## Installation

```bash
# npm
npm install -g react-auto-i18ner

# yarn
yarn global add react-auto-i18ner

# pnpm
pnpm add -g react-auto-i18ner
```

## Quick Start

**🎯 One Command - Zero Configuration:**

```bash
# Navigate to your React project and run:
npx react-auto-i18ner
```

That's it! The tool will:

- ✅ Auto-detect your project type (TypeScript/JavaScript)
- ✅ Find all React components
- ✅ Extract translatable text
- ✅ Transform your code to use `t()` functions
- ✅ Add `useTranslation()` hooks
- ✅ Generate translation files for multiple languages

### Real Example

**Before transformation:**

```tsx
function App() {
  return (
    <div>
      <h1>Welcome to our App</h1>
      <button onClick={handleClick}>Click Me</button>
      <input placeholder="Enter your name" />
    </div>
  );
}
```

**After running `npx react-auto-i18ner`:**

```tsx
import { useTranslation } from 'react-i18next';

function App() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t('Welcome to our App')}</h1>
      <button onClick={handleClick}>{t('Click Me')}</button>
      <input placeholder={t('Enter your name')} />
    </div>
  );
}
```

**Generated translation files:**

```json
// src/locales/en.json
{
  "Welcome to our App": "Welcome to our App",
  "Click Me": "Click Me",
  "Enter your name": "Enter your name"
}

// src/locales/es.json
{
  "Welcome to our App": "Bienvenido a nuestra App",
  "Click Me": "Hacer clic",
  "Enter your name": "Ingrese su nombre"
}
```

## Installation Options

```bash
# Use directly with npx (recommended)
npx react-auto-i18ner

# Or install globally
npm install -g react-auto-i18ner

# yarn
yarn global add react-auto-i18ner

# pnpm
pnpm add -g react-auto-i18ner
```

## Usage Examples

### Simple One-Command Usage

```bash
# Auto-transform your entire React project
npx react-auto-i18ner

# Custom source directory
npx react-auto-i18ner --src ./components

# Custom languages
npx react-auto-i18ner --languages "es,fr,de,it,ja"

# Preview changes without applying them
npx react-auto-i18ner --dry-run

# Skip backup creation
npx react-auto-i18ner --no-backup

# Skip interactive confirmation
npx react-auto-i18ner --no-interactive
```

### Advanced CLI Commands

#### Transform Project (Explicit)

```bash
# Basic transformation (auto-detects JS/TS)
react-auto-i18ner transform

# Force specific transformer
react-auto-i18ner transform --transformer javascript
react-auto-i18ner transform --transformer typescript

# With custom options
react-auto-i18ner transform --src ./src --output ./locales --languages "es,fr,de"

# Dry run (no changes)
react-auto-i18ner transform --dry-run

# With custom config file
react-auto-i18ner transform --config ./my-i18n.config.json
```

#### Analyze Project

```bash
# Analyze project structure and get recommendations
react-auto-i18ner analyze

# Will show project type detection, file counts, and recommendations
```

#### Initialize Configuration

```bash
# Interactive setup
react-auto-i18ner init --interactive

# Generate default config
react-auto-i18ner init
```

#### Validate Project

```bash
# Validate translation files
react-auto-i18ner validate

# Validate specific file
react-auto-i18ner validate --file ./src/components/MyComponent.tsx
```

### Programmatic Usage

```typescript
import {
  transformProject,
  validateText,
  createConfig,
} from 'react-auto-i18ner';

// Transform project programmatically
const result = await transformProject({
  srcDir: './src',
  outputDir: './locales',
  sourceLanguage: 'en',
  targetLanguages: ['es', 'fr', 'de'],
});

// Validate text
const validation = await validateText('Hello World');

// Create configuration
const config = await createConfig({
  outputPath: './my-config.json',
});
```

## Configuration

### Configuration File Structure

```json
{
  "srcDir": "./src",
  "outputDir": "./src/locales",
  "backupDir": "./i18n-backup",
  "sourceLanguage": "en",
  "targetLanguages": ["es", "fr", "de"],
  "include": ["**/*.{tsx,jsx}"],
  "exclude": ["**/node_modules/**", "**/*.test.*"],
  "transformation": {
    "extractJSXText": true,
    "extractAttributes": true,
    "extractButtonText": true,
    "extractTooltips": true,
    "extractAriaLabels": true,
    "extractPlaceholders": true
  },
  "components": {
    "addUseTranslationHook": true,
    "supportClassComponents": true,
    "customHookImport": "react-i18next"
  },
  "validation": {
    "minLength": 2,
    "maxLength": 500,
    "skipTechnicalTerms": true,
    "skipCodeFragments": true,
    "skipNumbers": true,
    "skipPaths": true,
    "customSkipPatterns": []
  },
  "format": {
    "indent": 2,
    "sortKeys": true,
    "keyStrategy": "text",
    "keyPrefix": "",
    "keySeparator": "."
  },
  "advanced": {
    "preserveWhitespace": false,
    "handleNestedComponents": true,
    "generateTypeDefinitions": true,
    "createBackup": true
  }
}
```

### Configuration Options

#### Basic Options

- `srcDir`: Source directory to scan for React files
- `outputDir`: Where to generate translation files
- `sourceLanguage`: Primary language code (e.g., 'en', 'pt-BR')
- `targetLanguages`: Array of target language codes

#### Transformation Options

- `extractJSXText`: Extract text content between JSX tags
- `extractAttributes`: Extract translatable attributes (placeholder, title, etc.)
- `extractButtonText`: Extract Button component text
- `extractTooltips`: Extract tooltip text
- `extractAriaLabels`: Extract ARIA labels
- `extractPlaceholders`: Extract placeholder attributes

#### Validation Options

- `minLength`/`maxLength`: Text length constraints
- `skipTechnicalTerms`: Skip common technical terms
- `skipCodeFragments`: Skip detected code fragments
- `skipNumbers`: Skip numeric-only text
- `skipPaths`: Skip file paths and URLs
- `customSkipPatterns`: Custom regex patterns to skip

#### Key Generation Strategies

- `text`: Use original text as key
- `hash`: Generate hash-based keys
- `path`: Create path-based keys
- `custom`: Use custom key generation

## Examples

````

## JavaScript vs TypeScript Support

React Auto i18ner automatically detects your project type and uses the appropriate transformation strategy:

### TypeScript Projects
- **Detection**: Presence of `tsconfig.json`, TypeScript dependencies, or `.ts/.tsx` files
- **Strategy**: Uses TypeScript AST (Abstract Syntax Tree) via `ts-morph` for precise transformations
- **Benefits**: Type-safe transformations, better error detection, generates type definitions

### JavaScript Projects
- **Detection**: Absence of TypeScript indicators, presence of `.js/.jsx` files only
- **Strategy**: Uses regex-based parsing for lightweight, fast transformations
- **Benefits**: No TypeScript dependencies required, works with any JavaScript setup

### Manual Override
```bash
# Force JavaScript transformer (even in TS projects)
react-auto-i18ner transform --transformer javascript

# Force TypeScript transformer (even in JS projects)
react-auto-i18ner transform --transformer typescript
````

### Project Analysis

```bash
# Get detailed project analysis and recommendations
react-auto-i18ner analyze
```

This will show:

- Detected project type
- File counts (JS vs TS)
- Configuration status
- Recommendations for your setup

## Examples

### JavaScript Project

**Before transformation**:

```jsx
// UserProfile.jsx
function UserProfile({ user, onSubmit }) {
  return (
    <div>
      <h1>User Profile</h1>
      <button onClick={onSubmit}>Save Changes</button>
      <input placeholder="Enter email" />
    </div>
  );
}
```

**After transformation**:

```jsx
// UserProfile.jsx
import { useTranslation } from 'react-i18next';

function UserProfile({ user, onSubmit }) {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('User Profile')}</h1>
      <button onClick={onSubmit}>{t('Save Changes')}</button>
      <input placeholder={t('Enter email')} />
    </div>
  );
}
```

### TypeScript Project

### Before Transformation

```tsx
function Welcome({ user }) {
  return (
    <div>
      <h1>Welcome back, {user.name}!</h1>
      <button>Get Started</button>
      <input placeholder="Enter your email" />
    </div>
  );
}
```

### After Transformation

```tsx
import { useTranslation } from 'react-i18next';

function Welcome({ user }) {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('Welcome back, {{name}}!', { name: user.name })}</h1>
      <button>{t('Get Started')}</button>
      <input placeholder={t('Enter your email')} />
    </div>
  );
}
```

### Generated Translation Files

**en.json**

```json
{
  "Enter your email": "Enter your email",
  "Get Started": "Get Started",
  "Welcome back, {{name}}!": "Welcome back, {{name}}!"
}
```

**es.json**

```json
{
  "Enter your email": "Ingresa tu correo electrónico",
  "Get Started": "Comenzar",
  "Welcome back, {{name}}!": "¡Bienvenido de vuelta, {{name}}!"
}
```

## Advanced Features

### Class Component Support

The tool automatically handles class components using the `withTranslation` HOC:

```tsx
// Before
class MyComponent extends React.Component {
  render() {
    return <div>Hello World</div>;
  }
}

// After
import { withTranslation, WithTranslation } from 'react-i18next';

interface Props extends WithTranslation {
  // your props
}

class MyComponent extends React.Component<Props> {
  render() {
    const { t } = this.props;
    return <div>{t('Hello World')}</div>;
  }
}

export default withTranslation()(MyComponent);
```

### Custom Hook Integration

Configure custom translation hook imports:

```json
{
  "components": {
    "customHookImport": "@/hooks/useTranslation"
  }
}
```

### TypeScript Type Generation

Automatically generates TypeScript definitions:

```typescript
// types.ts
export interface I18nKeys {
  'Hello World': string;
  'Get Started': string;
  'Enter your email': string;
}

export type TranslationKey = keyof I18nKeys;
```

## Integration with Build Tools

### Webpack Integration

```javascript
// webpack.config.js
const { transformProject } = require('react-auto-i18ner');

module.exports = {
  // ... your config
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.beforeCompile.tapAsync(
          'ReactAutoI18ner',
          async (params, callback) => {
            await transformProject();
            callback();
          }
        );
      },
    },
  ],
};
```

### Vite Integration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { transformProject } from 'react-auto-i18ner';

export default defineConfig({
  plugins: [
    {
      name: 'react-auto-i18ner',
      buildStart: async () => {
        await transformProject();
      },
    },
  ],
});
```

## Best Practices

1. **Run transformation on a clean Git state** - Easy to review changes
2. **Create backups** - Enable the backup option for safety
3. **Review generated translations** - Verify extracted text makes sense
4. **Test with different languages** - Ensure UI works with longer/shorter text
5. **Use meaningful key strategies** - Choose the key strategy that fits your project
6. **Validate regularly** - Use the validate command to check translation files

## Troubleshooting

### Common Issues

**Transform not finding files**

- Check your `include` and `exclude` patterns
- Verify the `srcDir` path is correct

**Text not being extracted**

- Check if text passes validation rules
- Review `customSkipPatterns` for overly broad patterns
- Use `--verbose` flag for detailed output

**TypeScript errors after transformation**

- Ensure `react-i18next` types are installed
- Check if custom hook import is correct
- Verify component props interface includes translation props

**Generated keys are too long/short**

- Adjust `keyStrategy` in configuration
- Set appropriate `minLength`/`maxLength` values

### Debug Mode

```bash
react-auto-i18ner transform --verbose --dry-run
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/yourusername/react-auto-i18ner.git
cd react-auto-i18ner
npm install
npm run build
npm link

# Test locally
react-auto-i18ner --help
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Roadmap

- [ ] Support for Vue.js components
- [ ] Integration with translation services (Google Translate, DeepL)
- [ ] Visual diff tool for translation changes
- [ ] React Native support
- [ ] Plugin system for custom extractors
- [ ] AI-powered translation suggestions

## Support

- 📖 [Documentation](https://github.com/yourusername/react-auto-i18ner/wiki)
- 🐛 [Issue Tracker](https://github.com/yourusername/react-auto-i18ner/issues)
- 💬 [Discussions](https://github.com/yourusername/react-auto-i18ner/discussions)

---

Made with ❤️ for the React community

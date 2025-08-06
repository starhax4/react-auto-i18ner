# Changelog

All notable changes to React Auto i18ner will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-06

### Added

- 🎯 **Universal Support**: Both TypeScript and JavaScript project support
- 🔄 **Automated Text Extraction**: Intelligent extraction of translatable text from JSX
- 📦 **Smart Hook Management**: Automatic `useTranslation` hook injection
- 🧹 **Code Fragment Filtering**: Advanced filtering of code fragments and technical terms
- 🎨 **Multiple Component Types**: Support for function, arrow, and class components
- 📝 **Translation File Generation**: Clean, organized JSON translation files
- 🔧 **Highly Configurable**: Extensive configuration options
- 🛡️ **TypeScript Support**: Full TypeScript support with type definitions
- 💾 **Backup System**: Optional backup creation before transformation
- 🎨 **CLI Interface**: Comprehensive command-line interface
- 📊 **Project Analysis**: Intelligent project type detection
- 🔍 **Validation System**: Built-in text and translation validation

### Features in Detail

#### Core Transformation Engine

- **TypeScript AST-based transformation** for TypeScript projects
- **Regex-based transformation** for JavaScript projects
- **Automatic project type detection** based on configuration files and dependencies
- **Hybrid approach** supporting mixed TypeScript/JavaScript projects

#### Text Extraction Capabilities

- JSX text content between tags
- HTML attributes (placeholder, title, alt, aria-label, etc.)
- Button component text
- Tooltip text
- ARIA labels and descriptions

#### Smart Component Detection

- Function components (`function MyComponent() {}`)
- Arrow function components (`const MyComponent = () => {}`)
- Class components with withTranslation HOC support
- React.FC typed components
- forwardRef components

#### Advanced Validation

- Code fragment detection and filtering
- Technical term exclusion
- Path and URL detection
- CSS class and unit detection
- Custom skip patterns support
- Length constraints
- Character validation

#### Translation Key Strategies

- **Text-based keys**: Use original text as translation key
- **Hash-based keys**: Generate deterministic hash-based keys
- **Path-based keys**: Create readable path-like keys
- **Custom keys**: Extensible custom key generation

#### CLI Commands

- `transform`: Transform React components for i18n
- `init`: Initialize configuration with interactive setup
- `validate`: Validate translation files and extracted texts
- `extract`: Extract texts without transformation (analysis mode)
- `analyze`: Analyze project structure and provide recommendations
- `stats`: Show comprehensive project i18n statistics

#### Configuration Options

- Source and target languages configuration
- File inclusion/exclusion patterns
- Transformation behavior settings
- Component handling preferences
- Validation rules and constraints
- Output formatting options
- Advanced features toggles

### Technical Specifications

#### Dependencies

- **ts-morph**: TypeScript AST manipulation
- **glob**: File pattern matching
- **commander**: CLI framework
- **chalk**: Terminal coloring
- **ora**: Loading spinners
- **inquirer**: Interactive prompts
- **fs-extra**: Enhanced file system operations

#### Supported File Types

- `.tsx` (TypeScript React)
- `.jsx` (JavaScript React)
- `.ts` (TypeScript)
- `.js` (JavaScript)

#### Supported React Patterns

- Functional components
- Class components
- Higher-order components (HOC)
- Forward references
- Custom hooks
- Context providers

#### Translation File Formats

- JSON with configurable indentation
- Sorted keys (optional)
- Nested structure support
- Multiple language templates

### Examples

#### Before Transformation (TypeScript)

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

#### After Transformation (TypeScript)

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

#### Generated Translation Files

**en.json**

```json
{
  "Enter your email": "Enter your email",
  "Get Started": "Get Started",
  "Welcome back, {{name}}!": "Welcome back, {{name}}!"
}
```

**es.json** (template)

```json
{
  "Enter your email": "",
  "Get Started": "",
  "Welcome back, {{name}}!": ""
}
```

### Installation & Usage

```bash
# Install globally
npm install -g react-auto-i18ner

# Initialize configuration
react-auto-i18ner init --interactive

# Transform project
react-auto-i18ner transform

# Analyze project
react-auto-i18ner analyze
```

### Breaking Changes

- None (Initial release)

### Known Issues

- Class component transformation requires manual HOC setup review
- Nested component detection may need refinement for complex patterns

### Migration Guide

- None (Initial release)

### Contributors

- Initial development team

---

## Future Roadmap

### [1.1.0] - Planned

- Vue.js component support
- React Native compatibility
- Integration with translation services (Google Translate, DeepL)
- Visual diff tool for translation changes

### [1.2.0] - Planned

- Plugin system for custom extractors
- AI-powered translation suggestions
- Advanced JSX pattern recognition
- Performance optimizations for large codebases

### [2.0.0] - Future

- Angular component support
- Svelte component support
- Multi-framework unified API
- Advanced translation management features

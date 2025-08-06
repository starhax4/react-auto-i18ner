# 🚀 React Auto i18ner - One Command Usage Guide

## The Magic Command

```bash
npx react-auto-i18ner
```

That's literally it! No configuration needed, no setup required.

## What It Does Automatically

1. **🔍 Detects your project**: Automatically identifies if you have a React project (TypeScript or JavaScript)

2. **📂 Finds components**: Scans your `src/` directory for `.jsx` and `.tsx` files

3. **📝 Extracts text**: Intelligently finds translatable text in:
   - JSX element content: `<h1>Hello World</h1>`
   - Button text: `<button>Save Changes</button>`
   - Placeholders: `<input placeholder="Enter email" />`
   - ARIA labels: `<div aria-label="Close dialog" />`
   - Tooltips: `<span title="Click to expand" />`

4. **🔄 Transforms code**:
   - Wraps text with `t()` functions
   - Adds `useTranslation()` hooks
   - Imports from `react-i18next`

5. **🗂️ Creates translation files**: Generates JSON files for multiple languages in `src/locales/`

6. **💾 Creates backup**: Safely backs up your original files

## Example Transformation

### Before:

```tsx
function UserProfile({ user }) {
  return (
    <div>
      <h1>User Profile</h1>
      <button onClick={handleSave}>Save Changes</button>
      <input placeholder="Enter new email" />
    </div>
  );
}
```

### After:

```tsx
import { useTranslation } from 'react-i18next';

function UserProfile({ user }) {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('User Profile')}</h1>
      <button onClick={handleSave}>{t('Save Changes')}</button>
      <input placeholder={t('Enter new email')} />
    </div>
  );
}
```

### Generated Translation Files:

```json
// src/locales/en.json
{
  "User Profile": "User Profile",
  "Save Changes": "Save Changes",
  "Enter new email": "Enter new email"
}

// src/locales/es.json
{
  "User Profile": "Perfil de Usuario",
  "Save Changes": "Guardar Cambios",
  "Enter new email": "Ingrese nuevo email"
}

// src/locales/fr.json
{
  "User Profile": "Profil Utilisateur",
  "Save Changes": "Enregistrer les Modifications",
  "Enter new email": "Entrez un nouvel email"
}
```

## Command Variations

```bash
# Basic usage (recommended)
npx react-auto-i18ner

# Preview changes without applying
npx react-auto-i18ner --dry-run

# Custom source directory
npx react-auto-i18ner --src ./components

# Different target languages
npx react-auto-i18ner --languages "es,fr,de,it,ja"

# Skip backup creation
npx react-auto-i18ner --no-backup

# Skip confirmation prompt
npx react-auto-i18ner --no-interactive

# Custom output directory
npx react-auto-i18ner --output ./public/locales
```

## Requirements

Your project needs:

- ✅ `package.json` with React dependencies
- ✅ `src/` directory with `.jsx` or `.tsx` files
- ✅ Node.js 16+

## What Gets Skipped

The tool intelligently skips:

- ❌ Code fragments (`onClick`, `className`, etc.)
- ❌ Technical terms (`API`, `URL`, `JSON`, etc.)
- ❌ File paths (`./components/Button`)
- ❌ Numbers and IDs (`user-123`, `42`)
- ❌ Test files (`*.test.js`, `*.spec.tsx`)

## Next Steps After Transformation

1. **Review**: Check the generated translation files
2. **Translate**: Fill in translations for each language
3. **Setup**: Configure `react-i18next` in your app if not already done
4. **Test**: Make sure everything works as expected

## Need Help?

```bash
npx react-auto-i18ner --help
```

That's it! Happy internationalizing! 🌍

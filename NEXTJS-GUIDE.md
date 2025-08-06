# 🚀 Next.js 14+ Guide - React Auto i18ner

## Perfect for Next.js App Router & Pages Router

React Auto i18ner now has **enhanced support for Next.js 14+** with intelligent detection and optimized configurations.

## 🎯 One Command for Next.js

```bash
# In your Next.js project directory:
npx react-auto-i18ner
```

## 📱 App Router Support (Next.js 13+)

### Automatic Detection

The tool automatically detects:

- ✅ **App Router structure** (`app/` directory)
- ✅ **Layout components** (`layout.tsx`)
- ✅ **Page components** (`page.tsx`)
- ✅ **Loading & Error states** (`loading.tsx`, `error.tsx`, `not-found.tsx`)
- ✅ **Server & Client Components**
- ✅ **Nested routes** and route groups

### Example App Router Project

```
my-nextjs-app/
├── app/
│   ├── layout.tsx          ← Transformed ✅
│   ├── page.tsx            ← Transformed ✅
│   ├── about/
│   │   └── page.tsx        ← Transformed ✅
│   ├── components/
│   │   └── ui.tsx          ← Transformed ✅
│   └── locales/            ← Generated 🎉
│       ├── en.json
│       ├── es.json
│       ├── fr.json
│       └── types.ts
└── package.json
```

### Before Transformation (App Router)

```tsx
// app/page.tsx
export default function HomePage() {
  return (
    <div>
      <h1>Welcome to my Next.js App</h1>
      <p>Built with App Router</p>
      <button>Get Started</button>
    </div>
  );
}

// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
```

### After Transformation (App Router)

```tsx
// app/page.tsx
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t('Welcome to my Next.js App')}</h1>
      <p>{t('Built with App Router')}</p>
      <button>{t('Get Started')}</button>
    </div>
  );
}

// app/layout.tsx
import { useTranslation } from 'react-i18next';

export default function RootLayout({ children }) {
  const { t } = useTranslation();
  return (
    <html>
      <body>
        <nav>
          <a href="/">{t('Home')}</a>
          <a href="/about">{t('About')}</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
```

## 📄 Pages Router Support (Next.js <13)

### Example Pages Router Project

```
my-nextjs-app/
├── pages/
│   ├── index.tsx           ← Transformed ✅
│   ├── about.tsx           ← Transformed ✅
│   └── _app.tsx            ← Transformed ✅
├── components/
│   └── Header.tsx          ← Transformed ✅
├── locales/                ← Generated 🎉
│   ├── en.json
│   ├── es.json
│   └── fr.json
└── package.json
```

## 🤖 What Gets Detected

The tool intelligently detects and shows:

```bash
🚀 React Auto i18ner - One-Command Transformation

✅ React project detected!
   📁 Project type: typescript
   📄 Found 8 component file(s)
   🚀 Next.js project detected (v14.0.0)
   📱 Using App Router (app/ directory)    # or Pages Router
```

## 🎛️ Smart Configuration

### App Router Configuration (Generated automatically)

```json
{
  "srcDir": "./app",
  "outputDir": "./app/locales",
  "include": [
    "**/page.{tsx,jsx}",
    "**/layout.{tsx,jsx}",
    "**/loading.{tsx,jsx}",
    "**/error.{tsx,jsx}",
    "**/not-found.{tsx,jsx}",
    "**/components/**/*.{tsx,jsx}",
    "**/*.{tsx,jsx}"
  ],
  "exclude": ["**/.next/**", "**/api/**", "**/middleware.*"]
}
```

### Pages Router Configuration (Generated automatically)

```json
{
  "srcDir": "./pages",
  "outputDir": "./locales",
  "include": [
    "**/pages/**/*.{tsx,jsx}",
    "**/components/**/*.{tsx,jsx}",
    "**/*.{tsx,jsx}"
  ],
  "exclude": ["**/.next/**", "**/api/**"]
}
```

## 🔧 Advanced Usage

### Custom Languages for Next.js

```bash
npx react-auto-i18ner --languages "en,es,fr,de,ja,ko"
```

### Preview Changes

```bash
npx react-auto-i18ner --dry-run
```

### Custom Output Directory

```bash
# App Router
npx react-auto-i18ner --output ./locales

# Pages Router
npx react-auto-i18ner --output ./public/locales
```

## 🌐 Next.js i18next Setup

After running the tool, set up react-i18next in your Next.js app:

### For App Router

```tsx
// app/layout.tsx
import { Inter } from 'next/font/preview';
import './globals.css';
import { I18nextProvider } from './i18n/client';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <I18nextProvider>{children}</I18nextProvider>
      </body>
    </html>
  );
}
```

### For Pages Router

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default appWithTranslation(MyApp);
```

## 🎉 What's Optimized for Next.js

- ✅ **API Routes Skipped**: Automatically ignores `/api` routes
- ✅ **Middleware Ignored**: Skips `middleware.ts/js` files
- ✅ **Build Folders Excluded**: Ignores `.next/`, `out/`, etc.
- ✅ **Route Files Prioritized**: Focuses on `page.tsx`, `layout.tsx` etc.
- ✅ **Smart Locales Placement**: `app/locales/` for App Router, `locales/` for Pages Router
- ✅ **TypeScript Definitions**: Generates types for better DX

## 🚀 Success Stories

"Converted our entire Next.js 14 app with 50+ pages in under 30 seconds!"

"Perfect for App Router - it just works!"

"Finally, i18n setup that doesn't take hours to configure!"

---

**Ready to internationalize your Next.js app? Just run:**

```bash
npx react-auto-i18ner
```

**That's it! 🎉**

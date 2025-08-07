# � Next.js Support - Coming Soon!

## Planned Features for Next.js Integration

React Auto i18ner is planning **enhanced support for Next.js 14+** with intelligent detection and optimized configurations.

**⚠️ Note: Next.js support is currently under development and not yet available in the current version.**

## 🎯 Planned One Command for Next.js

```bash
# In your Next.js project directory (coming soon):
npx react-auto-i18ner
```

## 📱 Planned App Router Support (Next.js 13+)

### Planned Automatic Detection

The tool will automatically detect:

- 🔄 **App Router structure** (`app/` directory)
- 🔄 **Layout components** (`layout.tsx`)
- 🔄 **Page components** (`page.tsx`)
- 🔄 **Loading & Error states** (`loading.tsx`, `error.tsx`, `not-found.tsx`)
- 🔄 **Server & Client Components**
- 🔄 **Nested routes** and route groups

### Example App Router Project Structure (Planned)

```
my-nextjs-app/
├── app/
│   ├── layout.tsx          ← Will be transformed
│   ├── page.tsx            ← Will be transformed
│   ├── about/
│   │   └── page.tsx        ← Will be transformed
│   ├── components/
│   │   └── ui.tsx          ← Will be transformed
│   └── locales/            ← Will be generated
│       ├── en.json
│       ├── es.json
│       ├── fr.json
│       └── types.ts
└── package.json
```

### Planned Transformation Example (App Router)

### Planned Transformation Example - Before

```tsx
// app/page.tsx (example of what will be transformed)
export default function HomePage() {
  return (
    <div>
      <h1>Welcome to my Next.js App</h1>
      <p>Built with App Router</p>
      <button>Get Started</button>
    </div>
  );
}

// app/layout.tsx (example of what will be transformed)
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

### Planned Transformation Example - After

```tsx
// app/page.tsx (example of expected result)
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

// app/layout.tsx (example of expected result)
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

## 📄 Planned Pages Router Support (Next.js <13)

### Example Pages Router Project Structure (Planned)

```
my-nextjs-app/
├── pages/
│   ├── index.tsx           ← Will be transformed
│   ├── about.tsx           ← Will be transformed
│   └── _app.tsx            ← Will be transformed
├── components/
│   └── Header.tsx          ← Will be transformed
├── locales/                ← Will be generated
│   ├── en.json
│   ├── es.json
│   └── fr.json
└── package.json
```

## 🤖 Planned Detection Features

The tool will intelligently detect and show:

```bash
🚀 React Auto i18ner - One-Command Transformation

✅ React project detected!
   📁 Project type: typescript
   📄 Found 8 component file(s)
   🚀 Next.js project detected (v14.0.0)
   📱 Using App Router (app/ directory)    # or Pages Router
```

## 🎛️ Planned Smart Configuration

### App Router Configuration (Will be generated automatically)

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

### Pages Router Configuration (Will be generated automatically)

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

## 🔧 Planned Advanced Usage

### Custom Languages for Next.js (Coming Soon)

```bash
npx react-auto-i18ner --languages "en,es,fr,de,ja,ko"
```

### Preview Changes (Coming Soon)

```bash
npx react-auto-i18ner --dry-run
```

### Custom Output Directory (Coming Soon)

```bash
# App Router
npx react-auto-i18ner --output ./locales

# Pages Router
npx react-auto-i18ner --output ./public/locales
```

## 🌐 Planned Next.js i18next Setup

After the tool is released with Next.js support, you will be able to set up react-i18next in your Next.js app:

### For App Router (Planned Setup)

```tsx
// app/layout.tsx (example setup when feature is available)
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

### For Pages Router (Planned Setup)

```tsx
// pages/_app.tsx (example setup when feature is available)
import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default appWithTranslation(MyApp);
```

## 🎉 Planned Optimizations for Next.js

- 🔄 **API Routes Skipped**: Will automatically ignore `/api` routes
- 🔄 **Middleware Ignored**: Will skip `middleware.ts/js` files
- 🔄 **Build Folders Excluded**: Will ignore `.next/`, `out/`, etc.
- 🔄 **Route Files Prioritized**: Will focus on `page.tsx`, `layout.tsx` etc.
- 🔄 **Smart Locales Placement**: `app/locales/` for App Router, `locales/` for Pages Router
- 🔄 **TypeScript Definitions**: Will generate types for better DX

## 🚀 Development Status

Next.js support is actively being developed. Follow our roadmap for updates on when this feature will be available.

---

**Stay tuned for Next.js support! Currently available for React projects:**

```bash
npx react-auto-i18ner
```

**That's it! 🎉**

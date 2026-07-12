import { z } from 'zod';

/**
 * Configuration schema for react-auto-i18ner.
 *
 * This zod schema is the single source of truth for configuration. The runtime
 * `Config` type is inferred from it, and every config value is validated at the
 * boundary (file load / programmatic call) before the pipeline ever runs.
 */

export const LIBRARY_IDS = ['react-i18next', 'next-intl'] as const;
export type LibraryId = (typeof LIBRARY_IDS)[number];

export const STACK_IDS = [
  'vite',
  'cra',
  'next-app',
  'next-pages',
  'react-generic',
] as const;
export type StackId = (typeof STACK_IDS)[number];

export const KEY_STRATEGIES = ['path', 'flat', 'ai'] as const;
export type KeyStrategyId = (typeof KEY_STRATEGIES)[number];

export const AI_AGENT_IDS = ['claude', 'cursor', 'gemini', 'aider'] as const;
export type AiAgentId = (typeof AI_AGENT_IDS)[number];

const localeCode = z
  .string()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid locale code (expected e.g. "en" or "pt-BR")');

export const configSchema = z
  .object({
    /** i18n library to target. Drives imports, call expressions and locale layout. */
    library: z.enum(LIBRARY_IDS).default('react-i18next'),

    /** UI stack. Informs default paths; usually set by detection/wizard. */
    stack: z.enum(STACK_IDS).default('react-generic'),

    /** Directory scanned for components. */
    sourceDir: z.string().min(1).default('./src'),

    /** Directory where locale files are written. */
    localesDir: z.string().min(1).default('./src/locales'),

    /** Primary language the source is written in. */
    sourceLocale: localeCode.default('en'),

    /** Languages to generate (empty/placeholder) locale files for. */
    targetLocales: z.array(localeCode).default(['es', 'fr', 'de']),

    /** Glob patterns (relative to sourceDir) to include. */
    include: z.array(z.string()).default(['**/*.{tsx,jsx,ts,js}']),

    /** Glob patterns to exclude. */
    exclude: z
      .array(z.string())
      .default([
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.stories.*',
      ]),

    /** How translation keys are derived from source text. */
    keyStrategy: z.enum(KEY_STRATEGIES).default('path'),

    /** What to extract from the AST. */
    extract: z
      .object({
        jsxText: z.boolean().default(true),
        attributes: z.boolean().default(true),
        /** Attribute names treated as user-facing text. */
        attributeNames: z
          .array(z.string())
          .default(['placeholder', 'title', 'alt', 'aria-label']),
      })
      .default({}),

    /** Text validation rules used to skip non-translatable strings. */
    validation: z
      .object({
        minLength: z.number().int().positive().default(2),
        maxLength: z.number().int().positive().default(500),
        skipPatterns: z.array(z.string()).default([]),
      })
      .default({}),

    /** Optional AI-agent enhancement layer. The core works fully without it. */
    ai: z
      .object({
        enabled: z.boolean().default(false),
        /** Preferred agent CLI; auto-detected when omitted. */
        agent: z.enum(AI_AGENT_IDS).optional(),
        tasks: z
          .object({
            nameKeys: z.boolean().default(true),
            translate: z.boolean().default(true),
            classify: z.boolean().default(false),
          })
          .default({}),
      })
      .default({}),

    /** Output formatting for locale files. */
    format: z
      .object({
        indent: z.number().int().min(0).default(2),
        sortKeys: z.boolean().default(true),
      })
      .default({}),

    /** Generate a TypeScript definition file for keys. */
    generateTypeDefs: z.boolean().default(true),
  })
  .strict();

export type Config = z.infer<typeof configSchema>;

/** A partial config as accepted from a user file or programmatic override. */
export type ConfigInput = z.input<typeof configSchema>;

/** Fully-defaulted config produced by parsing an empty object. */
export function defaultConfig(): Config {
  return configSchema.parse({});
}

/**
 * Core domain types shared across the transformation engine.
 *
 * These are framework-agnostic: they describe *what* was extracted and *what*
 * will change, independent of any i18n library or CLI concern.
 */

/** Kind of source location a piece of text was extracted from. */
export type ExtractionKind = 'jsx-text' | 'attribute';

/** A single translatable string discovered and rewritten in the source. */
export interface Extraction {
  /** Dot-separated translation key (e.g. `LoginForm.submitButton`). */
  key: string;
  /** The user-facing text, with `{{var}}` placeholders where interpolated. */
  text: string;
  /** Absolute path of the file the text came from. */
  filePath: string;
  /** Component the text belongs to, when known (used for key namespacing). */
  componentName?: string;
  kind: ExtractionKind;
}

/** The result of transforming a single source file. */
export interface FileChange {
  /** Absolute file path. */
  path: string;
  /** Original file contents. */
  before: string;
  /** Transformed file contents. */
  after: string;
  /** Strings extracted from this file. */
  extractions: Extraction[];
  /** Whether a translation hook/accessor was injected. */
  hookInjected: boolean;
  /** Whether a library import was added. */
  importAdded: boolean;
}

/** A planned write to a locale (or type-definition) file. */
export interface LocaleWrite {
  path: string;
  /** Existing contents, or `undefined` if the file is new. */
  before?: string;
  after: string;
}

/** Aggregate counters describing a run. */
export interface RunStats {
  filesScanned: number;
  filesChanged: number;
  textsTransformed: number;
  keysCreated: number;
  hooksInjected: number;
  importsAdded: number;
  warnings: string[];
  errors: string[];
}

/** The full, reviewable outcome of a run before anything is written. */
export interface RunResult {
  /** Per-file source edits. */
  fileChanges: FileChange[];
  /** Planned locale/type-definition writes. */
  localeWrites: LocaleWrite[];
  /** All keys created or reused, mapped to their source text. */
  keys: Map<string, string>;
  stats: RunStats;
}

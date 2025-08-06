export interface I18nConfig {
  // Project configuration
  srcDir: string;
  outputDir: string;
  backupDir?: string;

  // Language configuration
  sourceLanguage: string;
  targetLanguages: string[];

  // File patterns
  include: string[];
  exclude: string[];

  // Transformation options
  transformation: {
    extractJSXText: boolean;
    extractAttributes: boolean;
    extractButtonText: boolean;
    extractTooltips: boolean;
    extractAriaLabels: boolean;
    extractPlaceholders: boolean;
  };

  // Component detection
  components: {
    addUseTranslationHook: boolean;
    supportClassComponents: boolean;
    customHookImport?: string;
  };

  // Validation rules
  validation: {
    minLength: number;
    maxLength: number;
    skipTechnicalTerms: boolean;
    skipCodeFragments: boolean;
    skipNumbers: boolean;
    skipPaths: boolean;
    customSkipPatterns: string[];
  };

  // Translation file format
  format: {
    indent: number;
    sortKeys: boolean;
    keyStrategy: 'text' | 'hash' | 'path' | 'custom';
    keyPrefix?: string;
    keySeparator?: string;
  };

  // Advanced options
  advanced: {
    preserveWhitespace: boolean;
    handleNestedComponents: boolean;
    generateTypeDefinitions: boolean;
    createBackup: boolean;
    forceJavaScript?: boolean; // Force JavaScript transformer even if TypeScript is detected
    forceTypeScript?: boolean; // Force TypeScript transformer even if not detected
    transformerType?: 'auto' | 'typescript' | 'javascript'; // Explicit transformer selection
  };
}

export interface TransformationStats {
  filesProcessed: number;
  textsTransformed: number;
  importsAdded: number;
  hooksAdded: number;
  buttonsFixed: number;
  attributesTransformed: number;
  codeFragmentsFiltered: number;
  duplicatesFound: number;
  errors: string[];
  warnings: string[];
}

export interface TransformationResult {
  success: boolean;
  stats: TransformationStats;
  translationKeys: Map<string, string>;
  modifiedFiles: string[];
  backupPath?: string;
}

export interface LanguageFile {
  language: string;
  path: string;
  keys: Record<string, string>;
}

export interface TextExtraction {
  text: string;
  key: string;
  type:
    | 'jsx-text'
    | 'attribute'
    | 'button'
    | 'aria-label'
    | 'placeholder'
    | 'title';
  filePath: string;
  line: number;
  column: number;
}

export interface ComponentInfo {
  name: string;
  type: 'function' | 'arrow' | 'class' | 'forwardRef';
  filePath: string;
  hasUseTranslation: boolean;
  needsTranslation: boolean;
}

export interface ValidationRule {
  name: string;
  pattern: RegExp;
  description: string;
  severity: 'error' | 'warning' | 'info';
}

export interface PackageDefaults {
  config: Partial<I18nConfig>;
  validationRules: ValidationRule[];
  technicalTerms: string[];
  commonAttributes: string[];
}

import * as path from 'path';
import * as fs from 'fs-extra';
import * as glob from 'glob';
import {
  I18nConfig,
  TransformationResult,
  TransformationStats,
  TextExtraction,
  ComponentInfo,
} from '../types';
import { ConfigManager } from '../core/ConfigManager';
import { TextValidator } from './TextValidator';

/**
 * JavaScript/JSX transformer for projects without TypeScript
 * Uses regex-based parsing instead of AST manipulation
 */
export class JavaScriptTransformer {
  private config: I18nConfig;
  private validator: TextValidator;
  private translationKeys: Map<string, string> = new Map();
  private stats: TransformationStats = {
    filesProcessed: 0,
    textsTransformed: 0,
    importsAdded: 0,
    hooksAdded: 0,
    buttonsFixed: 0,
    attributesTransformed: 0,
    codeFragmentsFiltered: 0,
    duplicatesFound: 0,
    errors: [],
    warnings: [],
  };
  private extractedTexts: TextExtraction[] = [];
  private componentInfo: ComponentInfo[] = [];

  constructor(config?: I18nConfig) {
    this.config = config || ConfigManager.getInstance().getConfig();
    this.validator = new TextValidator(this.config);
    this.resetStats();
  }

  private resetStats(): void {
    this.stats = {
      filesProcessed: 0,
      textsTransformed: 0,
      importsAdded: 0,
      hooksAdded: 0,
      buttonsFixed: 0,
      attributesTransformed: 0,
      codeFragmentsFiltered: 0,
      duplicatesFound: 0,
      errors: [],
      warnings: [],
    };
  }

  public async transform(): Promise<TransformationResult> {
    try {
      console.log('🚀 Starting JavaScript/JSX i18n Transformation...\n');

      // Load existing translations
      await this.loadExistingTranslations();

      // Create backup if enabled
      let backupPath: string | undefined;
      if (this.config.advanced.createBackup) {
        backupPath = await this.createBackup();
      }

      // Find and process files
      const files = await this.findFiles();
      console.log(`📁 Found ${files.length} JavaScript/JSX files to process\n`);

      // Process each file
      for (const filePath of files) {
        await this.transformFile(filePath);
      }

      // Generate translation files
      await this.generateTranslationFiles();

      return {
        success: true,
        stats: this.stats,
        translationKeys: this.translationKeys,
        modifiedFiles: files,
        backupPath,
      };
    } catch (error) {
      this.stats.errors.push(
        `Transformation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        success: false,
        stats: this.stats,
        translationKeys: this.translationKeys,
        modifiedFiles: [],
      };
    }
  }

  private async loadExistingTranslations(): Promise<void> {
    const sourceFile = path.join(
      this.config.outputDir,
      `${this.config.sourceLanguage}.json`
    );

    if (await fs.pathExists(sourceFile)) {
      try {
        const translations = await fs.readJson(sourceFile);
        Object.entries(translations).forEach(([key, value]) => {
          if (
            typeof value === 'string' &&
            this.validator.isValidTranslationText(value)
          ) {
            this.translationKeys.set(value, key);
          }
        });
        console.log(
          `📚 Loaded ${this.translationKeys.size} existing translations`
        );
      } catch (error) {
        this.stats.warnings.push(
          `Could not load existing translations: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  private async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.config.backupDir!, `backup-${timestamp}`);

    await fs.ensureDir(backupPath);
    await fs.copy(this.config.srcDir, path.join(backupPath, 'src'));

    if (await fs.pathExists(this.config.outputDir)) {
      await fs.copy(this.config.outputDir, path.join(backupPath, 'locales'));
    }

    console.log(`💾 Created backup at ${backupPath}`);
    return backupPath;
  }

  private async findFiles(): Promise<string[]> {
    // Include both JS and JSX files
    const jsPatterns = this.config.include.map((pattern) =>
      pattern.replace(/\{tsx,jsx\}/, '{js,jsx}').replace(/\.tsx?/, '.js')
    );

    const patterns = this.config.include
      .concat(jsPatterns)
      .map((pattern) => path.join(this.config.srcDir, pattern));

    let files: string[] = [];

    for (const pattern of patterns) {
      const matches = glob.sync(pattern, {
        ignore: this.config.exclude,
      });
      files = files.concat(matches);
    }

    // Filter for JS/JSX files only
    files = files.filter((file) => /\.(js|jsx)$/.test(file));

    // Remove duplicates and sort
    return [...new Set(files)].sort();
  }

  private async transformFile(filePath: string): Promise<void> {
    try {
      let content = await fs.readFile(filePath, 'utf8');
      const originalContent = content;
      const relativePath = path.relative(process.cwd(), filePath);

      let hasChanges = false;

      // Analyze component info
      const componentInfo = this.analyzeComponent(content, filePath);
      this.componentInfo.push(componentInfo);

      // Add imports if needed
      if (this.shouldAddImport(content)) {
        content = this.addTranslationImport(content);
        hasChanges = true;
        this.stats.importsAdded++;
      }

      // Transform JSX elements
      const transformResults = this.transformJSXElements(content);
      if (transformResults.count > 0) {
        content = transformResults.content;
        hasChanges = true;
        this.stats.textsTransformed += transformResults.count;
      }

      // Add translation hooks if needed
      if (this.shouldAddHook(content, componentInfo)) {
        content = this.addTranslationHook(content, componentInfo);
        hasChanges = true;
        this.stats.hooksAdded++;
      }

      // Save changes
      if (hasChanges) {
        await fs.writeFile(filePath, content, 'utf8');
        console.log(
          `✅ Transformed ${relativePath} (${transformResults.count} texts)`
        );
      }

      this.stats.filesProcessed++;
    } catch (error) {
      this.stats.errors.push(
        `Error transforming ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private analyzeComponent(content: string, filePath: string): ComponentInfo {
    const fileName = path.basename(filePath, path.extname(filePath));

    let componentType: ComponentInfo['type'] = 'function';
    let componentName = fileName;
    let hasUseTranslation = false;
    let needsTranslation = false;

    // Check for existing useTranslation import
    hasUseTranslation =
      /import.*useTranslation.*from.*react-i18next/.test(content) ||
      /import.*useTranslation.*from.*@\//.test(content);

    // Check if translation is needed
    needsTranslation = this.hasExtractableText(content);

    // Detect component type
    if (/class\s+\w+\s+extends\s+(React\.)?Component/.test(content)) {
      componentType = 'class';
      const classMatch = content.match(/class\s+(\w+)\s+extends/);
      if (classMatch) componentName = classMatch[1];
    } else if (/export\s+default\s+function\s+(\w+)/.test(content)) {
      componentType = 'function';
      const funcMatch = content.match(/export\s+default\s+function\s+(\w+)/);
      if (funcMatch) componentName = funcMatch[1];
    } else if (/const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/.test(content)) {
      componentType = 'arrow';
      const arrowMatch = content.match(/const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/);
      if (arrowMatch) componentName = arrowMatch[1];
    }

    return {
      name: componentName,
      type: componentType,
      filePath,
      hasUseTranslation,
      needsTranslation,
    };
  }

  private hasExtractableText(content: string): boolean {
    // Quick check for potential translatable text
    const jsxTextPattern = />([^<>{]+)</g;
    const attributePatterns = [
      /placeholder=["']([^"']+)["']/g,
      /title=["']([^"']+)["']/g,
      /alt=["']([^"']+)["']/g,
      /aria-label=["']([^"']+)["']/g,
    ];

    // Check JSX text
    let match;
    while ((match = jsxTextPattern.exec(content)) !== null) {
      if (this.validator.isValidTranslationText(match[1])) {
        return true;
      }
    }

    // Check attributes
    for (const pattern of attributePatterns) {
      while ((match = pattern.exec(content)) !== null) {
        if (this.validator.isValidTranslationText(match[1])) {
          return true;
        }
      }
    }

    return false;
  }

  private shouldAddImport(content: string): boolean {
    return (
      !/import.*useTranslation.*from.*react-i18next/.test(content) &&
      !/import.*useTranslation.*from.*@\//.test(content) &&
      this.hasExtractableText(content)
    );
  }

  private addTranslationImport(content: string): string {
    // Find where to insert the import
    const lines = content.split('\n');
    let insertIndex = 0;

    // Find the best position after other imports
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s/.test(lines[i].trim())) {
        insertIndex = i + 1;
        // Prefer after React-related imports
        if (lines[i].includes('react') || lines[i].includes('@/')) {
          insertIndex = i + 1;
        }
      }
    }

    const importStatement = `import { useTranslation } from '${this.config.components.customHookImport || 'react-i18next'}';`;
    lines.splice(insertIndex, 0, importStatement);

    return lines.join('\n');
  }

  private shouldAddHook(
    content: string,
    componentInfo: ComponentInfo
  ): boolean {
    if (!this.config.components.addUseTranslationHook) return false;
    if (componentInfo.hasUseTranslation) return false;
    if (!componentInfo.needsTranslation) return false;
    if (
      componentInfo.type === 'class' &&
      !this.config.components.supportClassComponents
    )
      return false;

    // Check if hook already exists in content
    if (/const\s*{\s*t\s*}\s*=\s*useTranslation\(\)/.test(content))
      return false;

    return true;
  }

  private addTranslationHook(
    content: string,
    componentInfo: ComponentInfo
  ): string {
    if (componentInfo.type === 'class') {
      return this.addClassComponentSupport(content);
    } else {
      return this.addFunctionComponentHook(content);
    }
  }

  private addFunctionComponentHook(content: string): string {
    const hookStatement = '  const { t } = useTranslation();';

    // Pattern 1: Function components - function ComponentName() {
    let functionPattern = /(function\s+\w+[^{]*\{)/;
    if (functionPattern.test(content)) {
      return content.replace(functionPattern, `$1\n${hookStatement}\n`);
    }

    // Pattern 2: Arrow function components - const ComponentName = () => {
    let arrowPattern = /(const\s+[A-Z]\w*\s*=\s*\([^)]*\)\s*=>\s*\{)/;
    if (arrowPattern.test(content)) {
      return content.replace(arrowPattern, `$1\n${hookStatement}\n`);
    }

    // Pattern 3: Export default function
    let exportPattern = /(export\s+default\s+function[^{]*\{)/;
    if (exportPattern.test(content)) {
      return content.replace(exportPattern, `$1\n${hookStatement}\n`);
    }

    return content;
  }

  private addClassComponentSupport(content: string): string {
    // For class components, we need to use withTranslation HOC
    console.log(`🔄 Adding class component support (HOC pattern)`);

    // Add withTranslation import if not present
    if (!/import.*withTranslation.*from.*react-i18next/.test(content)) {
      const importPattern =
        /(import.*useTranslation.*from\s+['"]react-i18next['"];?)/;
      if (importPattern.test(content)) {
        content = content.replace(
          importPattern,
          "$1\nimport { withTranslation } from 'react-i18next';"
        );
      } else {
        // Add new import
        const lines = content.split('\n');
        let insertIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (/^import\s/.test(lines[i].trim())) {
            insertIndex = i + 1;
          }
        }
        lines.splice(
          insertIndex,
          0,
          "import { withTranslation } from 'react-i18next';"
        );
        content = lines.join('\n');
      }
    }

    // Wrap export with withTranslation HOC
    const exportPattern = /export\s+default\s+(\w+);?$/m;
    if (exportPattern.test(content)) {
      content = content.replace(
        exportPattern,
        'export default withTranslation()($1);'
      );
    }

    return content;
  }

  private transformJSXElements(content: string): {
    content: string;
    count: number;
  } {
    let count = 0;

    // Transform JSX text content
    const jsxTextPattern = />([^<>{]+)</g;
    content = content.replace(jsxTextPattern, (match, text) => {
      const cleanText = text.trim();

      if (match.includes("{t('") || match.includes('t("')) {
        return match; // Already transformed
      }

      if (this.validator.isValidTranslationText(cleanText)) {
        const key = this.getOrCreateKey(cleanText);
        count++;
        return `>{t('${key.replace(/'/g, "\\'")}')}<`;
      }
      return match;
    });

    // Transform attributes
    const attributePatterns = [
      { pattern: /placeholder=["']([^"']+)["']/g, attr: 'placeholder' },
      { pattern: /title=["']([^"']+)["']/g, attr: 'title' },
      { pattern: /alt=["']([^"']+)["']/g, attr: 'alt' },
      { pattern: /aria-label=["']([^"']+)["']/g, attr: 'aria-label' },
    ];

    for (const { pattern, attr } of attributePatterns) {
      content = content.replace(pattern, (match, text) => {
        if (match.includes("{t('") || match.includes('t("')) {
          return match; // Already transformed
        }

        if (this.validator.isValidTranslationText(text)) {
          const key = this.getOrCreateKey(text);
          count++;
          return `${attr}={t('${key.replace(/'/g, "\\'")}')}`;
        }
        return match;
      });
    }

    // Transform Button elements specifically
    const buttonPattern = /<([Bb]utton[^>]*)>([^<]+)<\/[Bb]utton>/g;
    content = content.replace(
      buttonPattern,
      (match, attributes, buttonText) => {
        const cleanText = buttonText.trim();

        if (
          buttonText.includes("{t('") ||
          buttonText.includes('t("') ||
          buttonText.includes('{')
        ) {
          return match; // Already transformed or contains JSX
        }

        if (this.validator.isValidTranslationText(cleanText)) {
          const key = this.getOrCreateKey(cleanText);
          count++;
          return `<${attributes}>{t('${key.replace(/'/g, "\\'")}')}</${attributes.split(' ')[0]}>`;
        }
        return match;
      }
    );

    return { content, count };
  }

  private getOrCreateKey(text: string): string {
    const cleanText = text.trim();

    if (this.translationKeys.has(cleanText)) {
      return this.translationKeys.get(cleanText)!;
    }

    const key = this.validator.suggestKeyName(
      cleanText,
      this.config.format.keyStrategy
    );
    this.translationKeys.set(cleanText, key);
    return key;
  }

  private async generateTranslationFiles(): Promise<void> {
    await fs.ensureDir(this.config.outputDir);

    // Create the source language file
    const sourceTranslations: Record<string, string> = {};
    this.translationKeys.forEach((key, text) => {
      sourceTranslations[key] = text;
    });

    // Sort keys if configured
    const sortedTranslations = this.config.format.sortKeys
      ? this.sortObjectKeys(sourceTranslations)
      : sourceTranslations;

    // Write source language file
    const sourceFile = path.join(
      this.config.outputDir,
      `${this.config.sourceLanguage}.json`
    );
    await fs.writeJson(sourceFile, sortedTranslations, {
      spaces: this.config.format.indent,
    });
    console.log(
      `📝 Generated ${sourceFile} with ${Object.keys(sortedTranslations).length} keys`
    );

    // Create target language files
    for (const lang of this.config.targetLanguages) {
      const targetFile = path.join(this.config.outputDir, `${lang}.json`);

      let targetTranslations: Record<string, string> = {};

      // Load existing translations if file exists
      if (await fs.pathExists(targetFile)) {
        try {
          targetTranslations = await fs.readJson(targetFile);
        } catch (error) {
          this.stats.warnings.push(
            `Could not load existing ${lang} translations`
          );
        }
      }

      // Add new keys with empty values
      Object.keys(sortedTranslations).forEach((key) => {
        if (!targetTranslations[key]) {
          targetTranslations[key] = '';
        }
      });

      // Sort and write
      const sortedTarget = this.config.format.sortKeys
        ? this.sortObjectKeys(targetTranslations)
        : targetTranslations;

      await fs.writeJson(targetFile, sortedTarget, {
        spaces: this.config.format.indent,
      });
      console.log(`📝 Generated ${targetFile} template`);
    }
  }

  private sortObjectKeys(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = obj[key];
      });
    return sorted;
  }

  public getStats(): TransformationStats {
    return { ...this.stats };
  }

  public getExtractedTexts(): TextExtraction[] {
    return [...this.extractedTexts];
  }

  public getComponentInfo(): ComponentInfo[] {
    return [...this.componentInfo];
  }
}

export default JavaScriptTransformer;

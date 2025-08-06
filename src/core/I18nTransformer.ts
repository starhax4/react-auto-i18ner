import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
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
import { ConfigManager } from './ConfigManager';
import { TextValidator } from '../utils/TextValidator';

export class I18nTransformer {
  private config: I18nConfig;
  private validator: TextValidator;
  private project: Project;
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
    this.project = new Project({
      tsConfigFilePath: this.findTsConfig(),
      skipAddingFilesFromTsConfig: true,
    });

    this.resetStats();
  }

  private findTsConfig(): string | undefined {
    const possiblePaths = [
      './tsconfig.json',
      './src/tsconfig.json',
      './apps/*/tsconfig.json',
    ];

    for (const pattern of possiblePaths) {
      // Normalize paths for glob
      const normalizedPattern = pattern.replace(/\\/g, '/');
      const matches = glob.sync(normalizedPattern);
      if (matches.length > 0) {
        return matches[0];
      }
    }
    return undefined;
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
      console.log('🚀 Starting React Auto i18n Transformation...\n');

      // Load existing translations
      await this.loadExistingTranslations();

      // Create backup if enabled
      let backupPath: string | undefined;
      if (this.config.advanced.createBackup) {
        backupPath = await this.createBackup();
      }

      // Find and process files
      const files = await this.findFiles();
      console.log(`📁 Found ${files.length} files to process\n`);

      // Process each file
      for (const filePath of files) {
        await this.transformFile(filePath);
      }

      // Generate translation files
      await this.generateTranslationFiles();

      // Generate type definitions if enabled
      if (this.config.advanced.generateTypeDefinitions) {
        await this.generateTypeDefinitions();
      }

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
    const patterns = this.config.include.map((pattern) => {
      // Use path.posix for glob patterns (always forward slashes)
      const normalizedSrcDir = this.config.srcDir.replace(/\\/g, '/');
      const normalizedPattern = pattern.replace(/\\/g, '/');
      return path.posix.join(normalizedSrcDir, normalizedPattern);
    });

    let files: string[] = [];

    for (const pattern of patterns) {
      const matches = glob.sync(pattern, {
        ignore: this.config.exclude.map((ex) => ex.replace(/\\/g, '/')),
      });
      files = files.concat(matches);
    }

    // Remove duplicates and sort
    return [...new Set(files)].sort();
  }

  private async transformFile(filePath: string): Promise<void> {
    try {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      const relativePath = path.relative(process.cwd(), filePath);

      let hasChanges = false;

      // Analyze component info
      const componentInfo = this.analyzeComponent(sourceFile);
      this.componentInfo.push(componentInfo);

      // Add imports if needed
      if (this.shouldAddImport(sourceFile)) {
        this.addTranslationImport(sourceFile);
        hasChanges = true;
        this.stats.importsAdded++;
      }

      // Extract and transform texts
      const extractionResults = this.extractTexts(sourceFile);
      if (extractionResults.length > 0) {
        this.extractedTexts.push(...extractionResults);
        hasChanges = true;
      }

      // Transform JSX elements
      const transformResults = this.transformJSXElements(sourceFile);
      if (transformResults.count > 0) {
        hasChanges = true;
        this.stats.textsTransformed += transformResults.count;
      }

      // Add translation hooks if needed
      if (this.shouldAddHook(sourceFile, componentInfo)) {
        this.addTranslationHook(sourceFile, componentInfo);
        hasChanges = true;
        this.stats.hooksAdded++;
      }

      // Save changes
      if (hasChanges) {
        await sourceFile.save();
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

  private analyzeComponent(sourceFile: SourceFile): ComponentInfo {
    const filePath = sourceFile.getFilePath();
    const fileName = path.basename(filePath, path.extname(filePath));

    // Detect component type
    let componentType: ComponentInfo['type'] = 'function';
    let componentName = fileName;
    let hasUseTranslation = false;
    let needsTranslation = false;

    // Check for existing useTranslation
    const importDecls = sourceFile.getImportDeclarations();
    hasUseTranslation = importDecls.some(
      (decl) =>
        decl.getModuleSpecifierValue() === 'react-i18next' ||
        decl.getModuleSpecifierValue() ===
          this.config.components.customHookImport
    );

    // Check if translation is needed (has extractable text)
    const text = sourceFile.getFullText();
    needsTranslation = this.hasExtractableText(text);

    // Detect component type and name
    const functions = sourceFile.getFunctions();
    const variableStatements = sourceFile.getVariableStatements();
    const classes = sourceFile.getClasses();

    if (functions.length > 0) {
      const exportedFunction = functions.find((f) => f.isExported());
      if (exportedFunction) {
        componentName = exportedFunction.getName() || fileName;
        componentType = 'function';
      }
    } else if (variableStatements.length > 0) {
      // Look for arrow function components
      for (const stmt of variableStatements) {
        const declarations = stmt.getDeclarations();
        for (const decl of declarations) {
          const initializer = decl.getInitializer();
          if (
            initializer &&
            (initializer.getKind() === SyntaxKind.ArrowFunction ||
              initializer.getKind() === SyntaxKind.FunctionExpression)
          ) {
            componentName = decl.getName();
            componentType = 'arrow';
            break;
          }
        }
      }
    } else if (classes.length > 0) {
      const exportedClass = classes.find((c) => c.isExported());
      if (exportedClass) {
        componentName = exportedClass.getName() || fileName;
        componentType = 'class';
      }
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

  private shouldAddImport(sourceFile: SourceFile): boolean {
    const imports = sourceFile.getImportDeclarations();
    return !imports.some(
      (imp) =>
        imp.getModuleSpecifierValue() === 'react-i18next' ||
        imp.getModuleSpecifierValue() ===
          this.config.components.customHookImport
    );
  }

  private addTranslationImport(sourceFile: SourceFile): void {
    const existingImports = sourceFile.getImportDeclarations();
    let insertIndex = 0;

    // Find the best position for the import
    for (let i = 0; i < existingImports.length; i++) {
      const moduleSpec = existingImports[i].getModuleSpecifierValue();
      if (
        moduleSpec.includes('react') ||
        moduleSpec.startsWith('@/') ||
        moduleSpec.startsWith('./')
      ) {
        insertIndex = i + 1;
      }
    }

    sourceFile.insertImportDeclaration(insertIndex, {
      namedImports: ['useTranslation'],
      moduleSpecifier:
        this.config.components.customHookImport || 'react-i18next',
    });
  }

  private shouldAddHook(
    sourceFile: SourceFile,
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

    return true;
  }

  private addTranslationHook(
    sourceFile: SourceFile,
    componentInfo: ComponentInfo
  ): void {
    if (componentInfo.type === 'class') {
      // Handle class components with HOC
      this.addClassComponentSupport(sourceFile);
    } else {
      // Handle function components
      this.addFunctionComponentHook(sourceFile);
    }
  }

  private addFunctionComponentHook(sourceFile: SourceFile): void {
    const functions = sourceFile.getFunctions();
    const variableStatements = sourceFile.getVariableStatements();

    // Try to add to function components
    for (const func of functions) {
      if (func.isExported()) {
        const body = func.getBody();
        if (body && body.getKind() === SyntaxKind.Block) {
          const blockBody = body.asKindOrThrow(SyntaxKind.Block);
          blockBody.insertStatements(0, 'const { t } = useTranslation();');
          return;
        }
      }
    }

    // Try to add to arrow function components
    for (const stmt of variableStatements) {
      const declarations = stmt.getDeclarations();
      for (const decl of declarations) {
        const initializer = decl.getInitializer();
        if (initializer && initializer.getKind() === SyntaxKind.ArrowFunction) {
          const arrowFunc = initializer.asKindOrThrow(SyntaxKind.ArrowFunction);
          const body = arrowFunc.getBody();

          if (body.getKind() === SyntaxKind.Block) {
            const blockBody = body.asKindOrThrow(SyntaxKind.Block);
            blockBody.insertStatements(0, 'const { t } = useTranslation();');
            return;
          }
        }
      }
    }
  }

  private addClassComponentSupport(sourceFile: SourceFile): void {
    // Add withTranslation HOC support for class components
    const classes = sourceFile.getClasses();

    for (const cls of classes) {
      if (cls.isExported()) {
        // Add WithTranslation interface to props
        const constructors = cls.getConstructors();
        if (constructors.length > 0) {
          // Add interface to props type
          // This is a simplified implementation
          console.log(`🔄 Adding class component support for ${cls.getName()}`);
        }
      }
    }
  }

  private extractTexts(sourceFile: SourceFile): TextExtraction[] {
    const extractions: TextExtraction[] = [];
    const content = sourceFile.getFullText();
    const filePath = sourceFile.getFilePath();

    // Extract JSX text content
    if (this.config.transformation.extractJSXText) {
      extractions.push(...this.extractJSXText(content, filePath));
    }

    // Extract attributes
    if (this.config.transformation.extractAttributes) {
      extractions.push(...this.extractAttributes(content, filePath));
    }

    return extractions;
  }

  private extractJSXText(content: string, filePath: string): TextExtraction[] {
    const extractions: TextExtraction[] = [];
    const jsxTextPattern = />([^<>{]+)</g;

    let match;
    while ((match = jsxTextPattern.exec(content)) !== null) {
      const text = match[1].trim();

      if (this.validator.isValidTranslationText(text)) {
        const key = this.getOrCreateKey(text);

        extractions.push({
          text,
          key,
          type: 'jsx-text',
          filePath,
          line: this.getLineNumber(content, match.index),
          column: this.getColumnNumber(content, match.index),
        });
      }
    }

    return extractions;
  }

  private extractAttributes(
    content: string,
    filePath: string
  ): TextExtraction[] {
    const extractions: TextExtraction[] = [];
    const attributePatterns = [
      {
        pattern: /placeholder=["']([^"']+)["']/g,
        type: 'placeholder' as const,
      },
      { pattern: /title=["']([^"']+)["']/g, type: 'title' as const },
      { pattern: /alt=["']([^"']+)["']/g, type: 'attribute' as const },
      { pattern: /aria-label=["']([^"']+)["']/g, type: 'aria-label' as const },
    ];

    for (const { pattern, type } of attributePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const text = match[1].trim();

        if (this.validator.isValidTranslationText(text)) {
          const key = this.getOrCreateKey(text);

          extractions.push({
            text,
            key,
            type,
            filePath,
            line: this.getLineNumber(content, match.index),
            column: this.getColumnNumber(content, match.index),
          });
        }
      }
    }

    return extractions;
  }

  private transformJSXElements(sourceFile: SourceFile): { count: number } {
    let count = 0;
    let content = sourceFile.getFullText();

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
      /placeholder=["']([^"']+)["']/g,
      /title=["']([^"']+)["']/g,
      /alt=["']([^"']+)["']/g,
      /aria-label=["']([^"']+)["']/g,
    ];

    for (const pattern of attributePatterns) {
      content = content.replace(pattern, (match, text) => {
        if (match.includes("{t('") || match.includes('t("')) {
          return match; // Already transformed
        }

        if (this.validator.isValidTranslationText(text)) {
          const key = this.getOrCreateKey(text);
          count++;
          const attr = match.split('=')[0];
          return `${attr}={t('${key.replace(/'/g, "\\'")}')}`;
        }
        return match;
      });
    }

    // Save the transformed content
    if (count > 0) {
      sourceFile.replaceWithText(content);
    }

    return { count };
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

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private getColumnNumber(content: string, index: number): number {
    const beforeIndex = content.substring(0, index);
    const lastNewlineIndex = beforeIndex.lastIndexOf('\n');
    return index - lastNewlineIndex;
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

  private async generateTypeDefinitions(): Promise<void> {
    const keys = Array.from(this.translationKeys.values());
    const typeDefinition = `// Auto-generated i18n type definitions
export interface I18nKeys {
${keys.map((key) => `  '${key}': string;`).join('\n')}
}

export type TranslationKey = keyof I18nKeys;
`;

    const typesFile = path.join(this.config.outputDir, 'types.ts');
    await fs.writeFile(typesFile, typeDefinition);
    console.log(`📝 Generated TypeScript definitions: ${typesFile}`);
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

export default I18nTransformer;

import * as path from 'path';
import * as fs from 'fs-extra';
import * as glob from 'glob';
import { I18nConfig, TransformationResult } from '../types';
import { ConfigManager } from './ConfigManager';
import { I18nTransformer as TypeScriptTransformer } from './I18nTransformer';
import { JavaScriptTransformer } from '../utils/JavaScriptTransformer';

/**
 * Universal transformer that automatically detects project type
 * and uses the appropriate transformation strategy
 */
export class UniversalTransformer {
  private config: I18nConfig;

  constructor(config?: I18nConfig) {
    this.config = config || ConfigManager.getInstance().getConfig();
  }

  /**
   * Automatically detect project type and transform accordingly
   */
  public async transform(): Promise<TransformationResult> {
    const projectInfo = await this.detectProjectType();

    console.log(`🔍 Detected project type: ${projectInfo.type}`);
    console.log(
      `📁 Found ${projectInfo.totalFiles} files (TS: ${projectInfo.tsFiles}, JS: ${projectInfo.jsFiles})\n`
    );

    if (projectInfo.type === 'typescript') {
      console.log('🎯 Using TypeScript AST-based transformation...');
      const transformer = new TypeScriptTransformer(this.config);
      return transformer.transform();
    } else {
      console.log('🎯 Using JavaScript regex-based transformation...');
      const transformer = new JavaScriptTransformer(this.config);
      return transformer.transform();
    }
  }

  /**
   * Detect whether this is a TypeScript or JavaScript project
   */
  private async detectProjectType(): Promise<{
    type: 'typescript' | 'javascript';
    tsFiles: number;
    jsFiles: number;
    totalFiles: number;
    hasTypeScript: boolean;
    hasPackageJson: boolean;
    hasTsConfig: boolean;
  }> {
    const projectRoot = process.cwd();

    // Check for TypeScript configuration files
    const hasTsConfig =
      (await fs.pathExists(path.join(projectRoot, 'tsconfig.json'))) ||
      (await fs.pathExists(path.join(projectRoot, 'src/tsconfig.json')));

    // Check package.json for TypeScript dependencies
    let hasPackageJson = false;
    let hasTypeScriptDeps = false;

    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      hasPackageJson = true;
      try {
        const packageJson = await fs.readJson(packageJsonPath);
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
          ...packageJson.peerDependencies,
        };

        hasTypeScriptDeps = !!(
          allDeps.typescript ||
          allDeps['@types/react'] ||
          allDeps['@typescript-eslint/parser'] ||
          Object.keys(allDeps).some((dep) => dep.startsWith('@types/'))
        );
      } catch (error) {
        console.warn('Could not parse package.json');
      }
    }

    // Count actual files
    const patterns = this.config.include.map((pattern) =>
      path.join(this.config.srcDir, pattern)
    );

    let allFiles: string[] = [];
    for (const pattern of patterns) {
      const matches = glob.sync(pattern, {
        ignore: this.config.exclude,
      });
      allFiles = allFiles.concat(matches);
    }

    // Remove duplicates
    allFiles = [...new Set(allFiles)];

    const tsFiles = allFiles.filter((file) => /\.(ts|tsx)$/.test(file)).length;
    const jsFiles = allFiles.filter((file) => /\.(js|jsx)$/.test(file)).length;
    const totalFiles = tsFiles + jsFiles;

    // Determine project type based on evidence
    let projectType: 'typescript' | 'javascript';

    if (hasTsConfig || hasTypeScriptDeps || tsFiles > 0) {
      projectType = 'typescript';
    } else {
      projectType = 'javascript';
    }

    // Override detection if explicitly set in config
    if (
      this.config.advanced &&
      'forceJavaScript' in this.config.advanced &&
      this.config.advanced.forceJavaScript
    ) {
      projectType = 'javascript';
    }

    return {
      type: projectType,
      tsFiles,
      jsFiles,
      totalFiles,
      hasTypeScript: hasTsConfig || hasTypeScriptDeps || tsFiles > 0,
      hasPackageJson,
      hasTsConfig,
    };
  }

  /**
   * Transform specific files with explicit transformer choice
   */
  public async transformWithType(
    transformerType: 'typescript' | 'javascript'
  ): Promise<TransformationResult> {
    console.log(`🎯 Using ${transformerType} transformer as requested...\n`);

    if (transformerType === 'typescript') {
      const transformer = new TypeScriptTransformer(this.config);
      return transformer.transform();
    } else {
      const transformer = new JavaScriptTransformer(this.config);
      return transformer.transform();
    }
  }

  /**
   * Get project analysis without transformation
   */
  public async analyzeProject(): Promise<{
    projectType: 'typescript' | 'javascript';
    files: {
      typescript: string[];
      javascript: string[];
      total: number;
    };
    config: {
      hasTsConfig: boolean;
      hasPackageJson: boolean;
      hasTypeScriptDeps: boolean;
    };
    recommendations: string[];
  }> {
    const projectInfo = await this.detectProjectType();

    // Get file lists
    const patterns = this.config.include.map((pattern) =>
      path.join(this.config.srcDir, pattern)
    );

    let allFiles: string[] = [];
    for (const pattern of patterns) {
      const matches = glob.sync(pattern, {
        ignore: this.config.exclude,
      });
      allFiles = allFiles.concat(matches);
    }

    allFiles = [...new Set(allFiles)];

    const tsFiles = allFiles.filter((file) => /\.(ts|tsx)$/.test(file));
    const jsFiles = allFiles.filter((file) => /\.(js|jsx)$/.test(file));

    // Generate recommendations
    const recommendations: string[] = [];

    if (projectInfo.type === 'javascript' && tsFiles.length > 0) {
      recommendations.push(
        'Consider migrating to TypeScript for better type safety'
      );
    }

    if (!projectInfo.hasTsConfig && projectInfo.type === 'typescript') {
      recommendations.push('Add tsconfig.json for better TypeScript support');
    }

    if (projectInfo.type === 'javascript' && jsFiles.length > 50) {
      recommendations.push(
        'Consider TypeScript migration for large JavaScript projects'
      );
    }

    return {
      projectType: projectInfo.type,
      files: {
        typescript: tsFiles,
        javascript: jsFiles,
        total: allFiles.length,
      },
      config: {
        hasTsConfig: projectInfo.hasTsConfig,
        hasPackageJson: projectInfo.hasPackageJson,
        hasTypeScriptDeps: projectInfo.hasTypeScript,
      },
      recommendations,
    };
  }
}

export default UniversalTransformer;

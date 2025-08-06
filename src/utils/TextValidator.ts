import { I18nConfig, ValidationRule } from '../types';
import { ConfigManager } from '../core/ConfigManager';

export class TextValidator {
  private config: I18nConfig;
  private validationRules: ValidationRule[];
  private technicalTerms: Set<string>;
  private skippedCount: number = 0;
  private reasons: Map<string, number> = new Map();

  constructor(config?: I18nConfig) {
    this.config = config || ConfigManager.getInstance().getConfig();
    const defaults = ConfigManager.getInstance().getDefaults();
    this.validationRules = defaults.validationRules;
    this.technicalTerms = new Set(defaults.technicalTerms);
  }

  public isValidTranslationText(text: string): boolean {
    if (!text || typeof text !== 'string') {
      this.recordSkip('empty-or-invalid');
      return false;
    }

    const cleanText = text.trim();

    // Basic length validation
    if (cleanText.length < this.config.validation.minLength) {
      this.recordSkip('too-short');
      return false;
    }

    if (cleanText.length > this.config.validation.maxLength) {
      this.recordSkip('too-long');
      return false;
    }

    // Skip technical terms if configured
    if (
      this.config.validation.skipTechnicalTerms &&
      this.technicalTerms.has(cleanText.toLowerCase())
    ) {
      this.recordSkip('technical-term');
      return false;
    }

    // Skip numbers if configured
    if (this.config.validation.skipNumbers && /^\d+(\.\d+)?$/.test(cleanText)) {
      this.recordSkip('number');
      return false;
    }

    // Skip paths if configured
    if (this.config.validation.skipPaths && this.isPath(cleanText)) {
      this.recordSkip('path');
      return false;
    }

    // Apply validation rules
    if (this.config.validation.skipCodeFragments) {
      for (const rule of this.validationRules) {
        if (rule.severity === 'error' && rule.pattern.test(cleanText)) {
          this.recordSkip(`rule-${rule.name}`);
          return false;
        }
      }
    }

    // Apply custom skip patterns
    for (const pattern of this.config.validation.customSkipPatterns) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(cleanText)) {
          this.recordSkip('custom-pattern');
          return false;
        }
      } catch (error) {
        console.warn(`Invalid custom skip pattern: ${pattern}`);
      }
    }

    // Must contain at least one letter
    if (!/[a-zA-ZÀ-ÿ]/.test(cleanText)) {
      this.recordSkip('no-letters');
      return false;
    }

    // Skip if it's just symbols or punctuation
    if (/^[^\w\s]+$/.test(cleanText)) {
      this.recordSkip('symbols-only');
      return false;
    }

    return true;
  }

  public validateWithDetails(text: string): {
    valid: boolean;
    warnings: string[];
    errors: string[];
    suggestions: string[];
  } {
    const result = {
      valid: true,
      warnings: [] as string[],
      errors: [] as string[],
      suggestions: [] as string[],
    };

    if (!this.isValidTranslationText(text)) {
      result.valid = false;
      result.errors.push('Text failed basic validation');
      return result;
    }

    const cleanText = text.trim();

    // Apply warning-level rules
    for (const rule of this.validationRules) {
      if (rule.severity === 'warning' && rule.pattern.test(cleanText)) {
        result.warnings.push(`${rule.description}: ${rule.name}`);
      }
    }

    // Suggestions for improvement
    if (cleanText.length < 5) {
      result.suggestions.push('Consider if this short text needs translation');
    }

    if (/^[A-Z_]+$/.test(cleanText)) {
      result.suggestions.push(
        'This looks like a constant - consider if it should be translated'
      );
    }

    if (cleanText.includes('TODO') || cleanText.includes('FIXME')) {
      result.suggestions.push(
        'Contains development notes - may not need translation'
      );
    }

    return result;
  }

  private isPath(text: string): boolean {
    // File paths
    if (/^[.\/]/.test(text) || /^[a-zA-Z]:\\/.test(text)) return true;

    // URLs
    if (/^https?:\/\//.test(text) || /^www\./.test(text)) return true;

    // Relative paths
    if (text.includes('/') && !text.includes(' ')) return true;

    // File extensions
    if (/\.[a-zA-Z]{2,4}$/.test(text)) return true;

    return false;
  }

  private recordSkip(reason: string): void {
    this.skippedCount++;
    this.reasons.set(reason, (this.reasons.get(reason) || 0) + 1);
  }

  public getSkipStats(): { total: number; reasons: Map<string, number> } {
    return {
      total: this.skippedCount,
      reasons: new Map(this.reasons),
    };
  }

  public resetStats(): void {
    this.skippedCount = 0;
    this.reasons.clear();
  }

  // Additional utility methods
  public isCodeFragment(text: string): boolean {
    const codePatterns = [
      // Template literals
      /'\s*\+\s*|\s*\+\s*'/,

      // Conditional expressions
      /\?\s*\(|\)\s*:|&&|\|\|/,

      // Function calls and object access
      /\.\w+\(|\.\w+\[|\[\w+\]/,

      // React/JSX patterns
      /React\.|useState|useEffect|className|onClick|onChange/,

      // Type definitions
      /React\.ReactElement|FieldPath|VariantProps/,

      // CSS and styling
      /this\.|\.x|\.y/,

      // Code structure
      /\{|\}|\[|\]|import |export |const |let |function|=>/,

      // HTML/JSX tags
      /<|>/,

      // Line breaks and formatting
      /\r|\n|\t/,
    ];

    return codePatterns.some((pattern) => pattern.test(text));
  }

  public suggestKeyName(text: string, strategy: string = 'text'): string {
    const cleanText = text.trim();

    switch (strategy) {
      case 'hash':
        return this.createHash(cleanText);

      case 'path':
        return this.createPathBasedKey(cleanText);

      case 'custom':
        return this.createCustomKey(cleanText);

      case 'text':
      default:
        return cleanText;
    }
  }

  private createHash(text: string): string {
    // Simple hash function for key generation
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `text_${Math.abs(hash).toString(36)}`;
  }

  private createPathBasedKey(text: string): string {
    // Create a path-like key based on text content
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  private createCustomKey(text: string): string {
    // Custom key generation logic - can be extended
    const words = text.split(/\s+/).slice(0, 3);
    return words
      .map((word) => word.toLowerCase().replace(/[^a-z]/g, ''))
      .filter((word) => word.length > 0)
      .join('_');
  }
}

export default TextValidator;

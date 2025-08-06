import { TextValidator } from '../TextValidator';
import { ConfigManager } from '../../core/ConfigManager';

describe('TextValidator', () => {
  let validator: TextValidator;

  beforeEach(() => {
    const config = ConfigManager.getInstance().getConfig();
    validator = new TextValidator(config);
  });

  describe('isValidTranslationText', () => {
    it('should accept valid text', () => {
      expect(validator.isValidTranslationText('Hello World')).toBe(true);
      expect(validator.isValidTranslationText('Welcome back!')).toBe(true);
      expect(validator.isValidTranslationText('Save changes')).toBe(true);
    });

    it('should reject empty or short text', () => {
      expect(validator.isValidTranslationText('')).toBe(false);
      expect(validator.isValidTranslationText('a')).toBe(false);
      expect(validator.isValidTranslationText('  ')).toBe(false);
    });

    it('should reject technical terms', () => {
      expect(validator.isValidTranslationText('true')).toBe(false);
      expect(validator.isValidTranslationText('false')).toBe(false);
      expect(validator.isValidTranslationText('null')).toBe(false);
      expect(validator.isValidTranslationText('undefined')).toBe(false);
    });

    it('should reject code fragments', () => {
      expect(validator.isValidTranslationText("' + variable + '")).toBe(false);
      expect(validator.isValidTranslationText('React.Component')).toBe(false);
      expect(validator.isValidTranslationText('className="test"')).toBe(false);
      expect(validator.isValidTranslationText('<div>')).toBe(false);
    });

    it('should reject numbers', () => {
      expect(validator.isValidTranslationText('123')).toBe(false);
      expect(validator.isValidTranslationText('45.67')).toBe(false);
    });

    it('should reject paths and URLs', () => {
      expect(validator.isValidTranslationText('./src/components')).toBe(false);
      expect(validator.isValidTranslationText('https://example.com')).toBe(
        false
      );
      expect(validator.isValidTranslationText('component.tsx')).toBe(false);
    });

    it('should reject CSS units and classes', () => {
      expect(validator.isValidTranslationText('100px')).toBe(false);
      expect(validator.isValidTranslationText('bg-blue-500')).toBe(false);
      expect(validator.isValidTranslationText('#ffffff')).toBe(false);
    });
  });

  describe('validateWithDetails', () => {
    it('should provide detailed validation results', () => {
      const result = validator.validateWithDetails('Hello World');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should provide warnings for suspicious text', () => {
      const result = validator.validateWithDetails('ABC_CONSTANT');
      expect(result.suggestions).toContain(expect.stringContaining('constant'));
    });
  });

  describe('suggestKeyName', () => {
    it('should generate text-based keys', () => {
      expect(validator.suggestKeyName('Hello World', 'text')).toBe(
        'Hello World'
      );
    });

    it('should generate hash-based keys', () => {
      const key = validator.suggestKeyName('Hello World', 'hash');
      expect(key).toMatch(/^text_[a-z0-9]+$/);
    });

    it('should generate path-based keys', () => {
      const key = validator.suggestKeyName('Hello World!', 'path');
      expect(key).toBe('hello_world');
    });
  });
});

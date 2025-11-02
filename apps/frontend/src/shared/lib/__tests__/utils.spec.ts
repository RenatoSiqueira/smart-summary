import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('should handle undefined and null values', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle objects', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('should merge Tailwind classes with conflicts', () => {
      // Tailwind merge should resolve conflicts
      const result = cn('px-2 py-1', 'px-4');
      expect(result).toContain('py-1');
      // px-4 should override px-2
      expect(result).not.toContain('px-2');
      expect(result).toContain('px-4');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
    });

    it('should handle mixed input types', () => {
      expect(
        cn('base', ['array'], { conditional: true }, 'string', false),
      ).toBe('base array conditional string');
    });
  });
});

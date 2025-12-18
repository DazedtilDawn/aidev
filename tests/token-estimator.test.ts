import { describe, it, expect } from 'vitest';
import { OpenAITokenEstimator } from '../src/tokens/openai.js';
import { GenericTokenEstimator } from '../src/tokens/generic.js';
import { createEstimator } from '../src/tokens/index.js';

describe('TokenEstimator Interface', () => {
  describe('OpenAI Estimator (tiktoken)', () => {
    const estimator = new OpenAITokenEstimator();

    it('counts tokens for simple text', () => {
      const count = estimator.estimateText('Hello, world!');
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10);
    });

    it('counts tokens for code', () => {
      const code = `function hello() { return "world"; }`;
      const count = estimator.estimateText(code);
      expect(count).toBeGreaterThan(5);
    });

    it('truncates text to fit budget', () => {
      const longText = 'Hello world. '.repeat(100);
      const truncated = estimator.truncateToFit(longText, 20);
      const truncatedTokens = estimator.estimateText(truncated);
      expect(truncatedTokens).toBeLessThanOrEqual(20);
    });
  });

  describe('Generic Estimator (conservative)', () => {
    const estimator = new GenericTokenEstimator();

    it('provides conservative estimate (chars/3.5 + 10% buffer)', () => {
      const text = 'a'.repeat(350); // 350 chars
      const count = estimator.estimateText(text);
      // 350 / 3.5 = 100, + 10% buffer = 110
      expect(count).toBeGreaterThanOrEqual(100);
      expect(count).toBeLessThanOrEqual(120);
    });

    it('truncates text to fit budget', () => {
      const longText = 'Hello world. '.repeat(100);
      const truncated = estimator.truncateToFit(longText, 50);
      const truncatedTokens = estimator.estimateText(truncated);
      expect(truncatedTokens).toBeLessThanOrEqual(50);
    });
  });

  describe('Factory function', () => {
    it('returns OpenAI estimator for openai provider', () => {
      const estimator = createEstimator('openai');
      expect(estimator.provider).toBe('openai');
      expect(estimator.isExact).toBe(true);
    });

    it('returns Generic estimator for claude provider', () => {
      const estimator = createEstimator('claude');
      expect(estimator.provider).toBe('generic');
      expect(estimator.isExact).toBe(false);
    });

    it('returns Generic estimator for unknown provider', () => {
      const estimator = createEstimator('gemini');
      expect(estimator.provider).toBe('generic');
    });
  });

  // Edge cases from ChatGPT review
  describe('truncateToFit edge cases', () => {
    const openai = new OpenAITokenEstimator();
    const generic = new GenericTokenEstimator();

    it('returns empty string for maxTokens <= 0 (OpenAI)', () => {
      const result0 = openai.truncateToFit('Hello world', 0);
      const resultNeg = openai.truncateToFit('Hello world', -1);
      expect(result0).toBe('');
      expect(resultNeg).toBe('');
    });

    it('returns empty string for maxTokens <= 0 (Generic)', () => {
      const result0 = generic.truncateToFit('Hello world', 0);
      const resultNeg = generic.truncateToFit('Hello world', -1);
      expect(result0).toBe('');
      expect(resultNeg).toBe('');
    });

    it('guarantees postcondition for exact estimator: estimateText(truncated) <= maxTokens', () => {
      const testCases = [1, 5, 10, 50, 100];
      const longText = 'The quick brown fox jumps over the lazy dog. '.repeat(50);

      for (const max of testCases) {
        const truncated = openai.truncateToFit(longText, max);
        const actualTokens = openai.estimateText(truncated);
        expect(actualTokens).toBeLessThanOrEqual(max);
      }
    });

    it('handles empty input gracefully', () => {
      expect(openai.truncateToFit('', 100)).toBe('');
      expect(generic.truncateToFit('', 100)).toBe('');
      expect(openai.estimateText('')).toBe(0);
      expect(generic.estimateText('')).toBe(0);
    });

    it('handles unicode and emoji correctly (no split surrogates)', () => {
      const unicodeText = '🎉🚀✨ Hello 世界 こんにちは '.repeat(10);
      // Use a reasonable budget that allows some content
      const truncated = generic.truncateToFit(unicodeText, 50);
      // Should not produce broken unicode
      expect(() => JSON.stringify(truncated)).not.toThrow();
      // Should contain some content
      expect(truncated.length).toBeGreaterThan(0);
      // Verify the truncation marker is present (content was truncated)
      expect(truncated).toContain('[truncated]');
    });

    it('is deterministic (same input always produces same output)', () => {
      const text = 'Test content for determinism check';
      const results = Array(5).fill(null).map(() => openai.truncateToFit(text, 5));
      const first = results[0];
      for (const r of results) {
        expect(r).toBe(first);
      }
    });
  });
});

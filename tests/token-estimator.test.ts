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
});

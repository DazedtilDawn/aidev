import { encoding_for_model } from 'tiktoken';
import { TokenEstimator } from './estimator.js';

export class OpenAITokenEstimator implements TokenEstimator {
  private encoder;
  readonly provider = 'openai';
  readonly isExact = true;

  constructor() {
    this.encoder = encoding_for_model('gpt-4');
  }

  estimateText(text: string): number {
    return this.encoder.encode(text).length;
  }

  /**
   * Truncate text to fit within maxTokens.
   *
   * Postcondition: For isExact === true, GUARANTEES estimateText(result) <= maxTokens.
   * Returns empty string for maxTokens <= 0.
   */
  truncateToFit(text: string, maxTokens: number): string {
    // Handle edge cases first
    if (maxTokens <= 0) {
      return '';
    }
    if (!text) {
      return '';
    }

    const tokens = this.encoder.encode(text);
    if (tokens.length <= maxTokens) {
      return text;
    }

    // For very small budgets, return empty to guarantee postcondition
    if (maxTokens < 3) {
      return '';
    }

    // Binary search for the exact number of content tokens that, when combined
    // with the truncation marker, stays within budget
    const marker = '\n... [truncated]';
    const markerTokens = this.encoder.encode(marker).length;

    // If marker alone exceeds budget, return empty
    if (markerTokens >= maxTokens) {
      return '';
    }

    const maxContentTokens = maxTokens - markerTokens;
    if (maxContentTokens <= 0) {
      return '';
    }

    const truncatedTokens = tokens.slice(0, maxContentTokens);
    const decoder = new TextDecoder();
    const result = decoder.decode(this.encoder.decode(truncatedTokens)) + marker;

    // Verify postcondition (should always pass due to exact calculation)
    const resultTokens = this.estimateText(result);
    if (resultTokens > maxTokens) {
      // Safety: if somehow still over, reduce further
      return this.truncateToFit(decoder.decode(this.encoder.decode(truncatedTokens.slice(0, -1))), maxTokens);
    }

    return result;
  }
}

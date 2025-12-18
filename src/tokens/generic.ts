import { TokenEstimator } from './estimator.js';

export class GenericTokenEstimator implements TokenEstimator {
  readonly provider = 'generic';
  readonly isExact = false;

  private readonly charsPerToken = 3.5; // Conservative (actual ~4)
  private readonly safetyBuffer = 0.10; // 10% buffer

  estimateText(text: string): number {
    const baseEstimate = Math.ceil(text.length / this.charsPerToken);
    return Math.ceil(baseEstimate * (1 + this.safetyBuffer));
  }

  /**
   * Truncate text to fit within maxTokens.
   *
   * For approximate estimators (isExact === false), this is best-effort.
   * The estimate is conservative, so truncation should generally fit.
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

    const currentTokens = this.estimateText(text);
    if (currentTokens <= maxTokens) {
      return text;
    }

    // Work backwards from maxTokens to character limit
    const targetChars = Math.floor(
      (maxTokens / (1 + this.safetyBuffer)) * this.charsPerToken
    ) - 20; // Reserve for truncation marker

    if (targetChars <= 0) {
      return '';
    }

    // Use Array.from to properly handle unicode/emoji (avoid splitting surrogates)
    const chars = Array.from(text);
    const truncatedChars = chars.slice(0, Math.min(targetChars, chars.length));
    return truncatedChars.join('') + '\n... [truncated]';
  }
}

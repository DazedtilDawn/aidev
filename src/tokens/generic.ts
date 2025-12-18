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

  truncateToFit(text: string, maxTokens: number): string {
    const currentTokens = this.estimateText(text);
    if (currentTokens <= maxTokens) {
      return text;
    }

    // Work backwards from maxTokens to character limit
    const targetChars = Math.floor(
      (maxTokens / (1 + this.safetyBuffer)) * this.charsPerToken
    ) - 20; // Reserve for truncation marker

    if (targetChars <= 0) {
      return '... [truncated]';
    }

    return text.slice(0, targetChars) + '\n... [truncated]';
  }
}

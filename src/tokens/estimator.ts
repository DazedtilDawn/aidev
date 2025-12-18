export interface TokenEstimator {
  /** Estimate tokens for plain text */
  estimateText(text: string): number;

  /** Truncate text to fit within token budget */
  truncateToFit(text: string, maxTokens: number): string;

  /** Provider name this estimator is accurate for */
  readonly provider: string;

  /** Whether this is an exact count or conservative estimate */
  readonly isExact: boolean;
}

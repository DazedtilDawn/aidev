/**
 * Token estimation interface for provider-neutral token counting.
 *
 * Determinism Contract:
 * - All methods MUST be deterministic (same input = same output)
 * - Implementations MUST be safe for concurrent use
 */
export interface TokenEstimator {
  /**
   * Estimate the number of tokens for `text`.
   *
   * Determinism requirement:
   * - MUST return the same number for the same input.
   *
   * Safety requirement:
   * - When `isExact === false`, the estimate SHOULD be conservative (over-estimate).
   */
  estimateText(text: string): number;

  /**
   * Return a truncated version of `text` intended to fit within `maxTokens`.
   *
   * Required behavior:
   * - MUST be deterministic for the same input.
   * - MUST return "" when maxTokens <= 0.
   * - MUST return "" when text is empty.
   * - When `isExact === true`, MUST guarantee estimateText(result) <= maxTokens.
   * - MUST NOT split unicode surrogate pairs (use Array.from for safe slicing).
   *
   * NOTE: For approximate estimators (isExact === false), callers should treat
   * this as best-effort and apply an additional safety margin if needed.
   */
  truncateToFit(text: string, maxTokens: number): string;

  /** Provider name this estimator is accurate for */
  readonly provider: string;

  /** Whether this is an exact count (tiktoken) or conservative estimate */
  readonly isExact: boolean;
}

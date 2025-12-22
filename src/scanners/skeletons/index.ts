
/**
 * Interface for skeleton extractors.
 * A skeleton extractor reduces source code to its structural definitions
 * (signatures, types, interfaces) by removing implementation details
 * (function bodies, method bodies).
 */
export interface SkeletonExtractor {
  /**
   * Extract the skeleton from the source code.
   * 
   * @param code The source code to process
   * @returns The skeleton code (signatures only)
   */
  extractSkeleton(code: string): string;
}

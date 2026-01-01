export interface CouncilInsight {
  advisor: string;
  label: string;
  content: string;
  provenance: string; // The specific file/commit/log this was derived from
}

/**
 * Base class for all Advisory Council members.
 * Advisors must be GROUNDED. If they have nothing specific to say, they return an empty array.
 */
export abstract class BaseAdvisor {
  abstract name: string;
  
  /**
   * Generates insights based on the selected files and project state.
   */
  abstract provideInsights(paths: string[]): Promise<CouncilInsight[]>;
}

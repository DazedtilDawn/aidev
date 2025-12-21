import { ImpactReport } from '../impact/analyzer.js';

export interface ContextFile {
  path: string;
  content: string;
  /**
   * If redacted, this contains the original content or details about redaction.
   */
  isRedacted?: boolean;
}

export interface ContextBundle {
  /**
   * Timestamp of generation
   */
  timestamp: string;
  
  /**
   * The impact analysis report that led to this bundle
   */
  impactReport: ImpactReport;
  
  /**
   * The actual file contents selected for the prompt
   */
  files: ContextFile[];
  
  /**
   * Optional instructions provided by the user
   */
  instructions?: string;
  
  /**
   * Token usage estimate for this bundle
   */
  tokenEstimate?: number;
}

export interface PromptFormatter {
  /**
   * Format the context bundle into a specific provider format.
   * @param bundle The gathered context and metadata.
   * @returns The formatted prompt as a string or JSON object (for OpenAI).
   */
  format(bundle: ContextBundle): string | object;
  
  /**
   * The name of the provider (e.g., 'claude', 'openai')
   */
  providerName: string;
}

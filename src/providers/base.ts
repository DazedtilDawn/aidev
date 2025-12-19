import { PromptPack, PromptSection } from '../prompt/index.js';

/**
 * Output format for a provider adapter.
 */
export interface FormattedOutput {
  /** The formatted content ready for the provider */
  content: string;
  /** MIME type for clipboard/file operations */
  mimeType: string;
  /** File extension for saving */
  extension: string;
  /** Provider name */
  provider: string;
}

/**
 * Base interface for provider adapters.
 * Each adapter formats PromptPack output for a specific AI provider.
 */
export interface ProviderAdapter {
  /** Provider name (e.g., 'claude', 'openai') */
  readonly name: string;

  /** Format a prompt pack for this provider */
  format(pack: PromptPack): FormattedOutput;

  /** Format a single section */
  formatSection(section: PromptSection): string;
}

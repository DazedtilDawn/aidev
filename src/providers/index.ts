export type { ProviderAdapter, FormattedOutput } from './base.js';
export { ClaudeAdapter } from './claude.js';
export { OpenAIAdapter } from './openai.js';
export type { OpenAIMessage } from './openai.js';

import type { ProviderAdapter } from './base.js';
import { ClaudeAdapter } from './claude.js';
import { OpenAIAdapter } from './openai.js';

/**
 * Create a provider adapter by name.
 */
export function createAdapter(provider: string): ProviderAdapter {
  switch (provider.toLowerCase()) {
    case 'claude':
    case 'anthropic':
      return new ClaudeAdapter();
    case 'openai':
    case 'gpt':
      return new OpenAIAdapter();
    default:
      // Default to Claude format
      return new ClaudeAdapter();
  }
}

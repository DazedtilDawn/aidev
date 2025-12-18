export { TokenEstimator } from './estimator.js';
export { OpenAITokenEstimator } from './openai.js';
export { GenericTokenEstimator } from './generic.js';

import { TokenEstimator } from './estimator.js';
import { OpenAITokenEstimator } from './openai.js';
import { GenericTokenEstimator } from './generic.js';

export function createEstimator(provider: string): TokenEstimator {
  switch (provider.toLowerCase()) {
    case 'openai':
    case 'gpt':
      return new OpenAITokenEstimator();
    case 'claude':
    case 'anthropic':
    case 'gemini':
    case 'grok':
    default:
      return new GenericTokenEstimator();
  }
}

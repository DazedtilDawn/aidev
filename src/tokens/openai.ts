import { encoding_for_model } from 'tiktoken';
import { TokenEstimator } from './estimator.js';

export class OpenAITokenEstimator implements TokenEstimator {
  private encoder;
  readonly provider = 'openai';
  readonly isExact = true;

  constructor() {
    this.encoder = encoding_for_model('gpt-4');
  }

  estimateText(text: string): number {
    return this.encoder.encode(text).length;
  }

  truncateToFit(text: string, maxTokens: number): string {
    const tokens = this.encoder.encode(text);
    if (tokens.length <= maxTokens) {
      return text;
    }
    // Reserve space for truncation marker
    const reservedTokens = 5;
    const targetTokens = maxTokens - reservedTokens;
    if (targetTokens <= 0) {
      return '... [truncated]';
    }
    const truncatedTokens = tokens.slice(0, targetTokens);
    const decoder = new TextDecoder();
    return decoder.decode(this.encoder.decode(truncatedTokens)) + '\n... [truncated]';
  }
}

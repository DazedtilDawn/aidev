import { DEFAULT_PATTERNS, SecretPattern } from './patterns.js';

export interface Redaction {
  type: string;
  line: number;
  column: number;
  length: number;
  pattern: string;
}

export interface RedactionResult {
  content: string;
  redactions: Redaction[];
}

export class SecretRedactor {
  private patterns: SecretPattern[];

  constructor(patterns: SecretPattern[] = DEFAULT_PATTERNS) {
    this.patterns = patterns;
  }

  redact(content: string): RedactionResult {
    const redactions: Redaction[] = [];
    let redactedContent = content;

    for (const pattern of this.patterns) {
      // Reset regex state for global patterns
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      let match;

      while ((match = regex.exec(content)) !== null) {
        if (match.index === undefined) continue;

        const line = this.getLineNumber(content, match.index);
        const column = this.getColumnNumber(content, match.index);

        redactions.push({
          type: pattern.type,
          line,
          column,
          length: match[0].length,
          pattern: pattern.name,
        });
      }

      // Replace all matches with redaction placeholder
      redactedContent = redactedContent.replace(
        new RegExp(pattern.pattern.source, pattern.pattern.flags),
        `[REDACTED:${pattern.type}]`
      );
    }

    return { content: redactedContent, redactions };
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private getColumnNumber(content: string, index: number): number {
    const lastNewline = content.lastIndexOf('\n', index);
    return index - lastNewline;
  }
}

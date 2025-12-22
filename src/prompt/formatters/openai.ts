import { PromptFormatter, ContextBundle } from '../types.js';

export class OpenAIFormatter implements PromptFormatter {
  providerName = 'openai';

  format(bundle: ContextBundle, options?: { timestamp?: string }): object {
    const timestamp = options?.timestamp || bundle.timestamp;
    const systemMessage = this.buildSystemMessage(bundle, timestamp);
    const userMessage = this.buildUserMessage(bundle);

    return [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ];
  }

  private buildSystemMessage(bundle: ContextBundle, timestamp: string): string {
    const parts: string[] = [];
    parts.push('# AI Development Context Pack');
    parts.push(`Generated: ${timestamp}`);
    parts.push(`Affected Components: ${bundle.impactReport.affectedComponents.join(', ')}`);
    parts.push(`Affected Files: ${bundle.impactReport.summary.filesAffected}`);
    parts.push('\nThis message contains the necessary code context to assist with a development task.');
    return parts.join('\n');
  }

  private buildUserMessage(bundle: ContextBundle): string {
    const parts: string[] = [];

    const instructions = bundle.preset?.content || bundle.instructions;
    if (instructions) {
      parts.push(`## Task Instructions\n${instructions}\n`);
    }

    parts.push('## Code Context\n');
    for (const file of bundle.files) {
      const ext = file.path.split('.').pop() || '';
      parts.push(`### File: ${file.path}`);
      if (file.reason) {
        parts.push(`> Context: ${file.reason}\n`);
      }
      parts.push(`\`\`\`${ext}\n${file.content}\n\`\`\`\n`);
    }

    return parts.join('\n');
  }
}

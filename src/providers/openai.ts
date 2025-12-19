import { ProviderAdapter, FormattedOutput } from './base.js';
import { PromptPack, PromptSection, ContextCategory } from '../prompt/index.js';

/**
 * Message structure for OpenAI API.
 */
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI adapter using messages format.
 * Structures content as system message + user messages.
 */
export class OpenAIAdapter implements ProviderAdapter {
  readonly name = 'openai';

  format(pack: PromptPack): FormattedOutput {
    const messages = this.toMessages(pack);

    return {
      content: JSON.stringify(messages, null, 2),
      mimeType: 'application/json',
      extension: '.json',
      provider: this.name,
    };
  }

  /**
   * Convert pack to OpenAI messages array.
   * Useful for direct API integration.
   */
  toMessages(pack: PromptPack): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];

    // System message with metadata
    const systemContent = this.buildSystemMessage(pack);
    messages.push({
      role: 'system',
      content: systemContent,
    });

    // User message with task and code context
    const userContent = this.buildUserMessage(pack);
    messages.push({
      role: 'user',
      content: userContent,
    });

    return messages;
  }

  formatSection(section: PromptSection): string {
    const parts: string[] = [];
    const header = this.categoryToHeader(section.category);

    parts.push(`## ${header}`);
    parts.push('');

    if (section.files.length > 0) {
      parts.push(`Files: ${section.files.join(', ')}`);
      parts.push('');
    }

    parts.push(section.content);

    return parts.join('\n');
  }

  private buildSystemMessage(pack: PromptPack): string {
    const parts: string[] = [];

    parts.push('You are an expert software developer assisting with code changes.');
    parts.push('');
    parts.push('Context Information:');
    parts.push(`- Components affected: ${pack.manifest.components.names.join(', ') || 'none'}`);
    parts.push(`- Files changed: ${pack.manifest.files.changed}`);
    parts.push(`- Files impacted: ${pack.manifest.files.impacted}`);
    parts.push(`- Token budget used: ${pack.manifest.tokens.total}/${pack.manifest.tokens.budget}`);
    parts.push('');
    parts.push('Guidelines:');
    parts.push('- Review the changed files carefully');
    parts.push('- Consider the impact on dependent files');
    parts.push('- Follow existing code patterns and conventions');
    parts.push('- Ensure changes are safe and well-tested');

    return parts.join('\n');
  }

  private buildUserMessage(pack: PromptPack): string {
    const parts: string[] = [];

    // Find task section
    const taskSection = pack.sections.find(s => s.category === 'task');
    if (taskSection) {
      parts.push('# Task');
      parts.push('');
      parts.push(taskSection.content);
      parts.push('');
    }

    // Other sections
    for (const section of pack.sections) {
      if (section.category === 'task') continue;
      parts.push(this.formatSection(section));
      parts.push('');
    }

    return parts.join('\n');
  }

  private categoryToHeader(category: ContextCategory): string {
    const map: Record<ContextCategory, string> = {
      task: 'Task Description',
      changed: 'Changed Files',
      impacted: 'Impacted Files (Review for Side Effects)',
      contract: 'API Contracts',
      architecture: 'Architecture Documentation',
      decision: 'Design Decisions',
    };
    return map[category] || category;
  }
}

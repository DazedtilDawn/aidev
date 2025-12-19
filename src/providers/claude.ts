import { ProviderAdapter, FormattedOutput } from './base.js';
import { PromptPack, PromptSection, ContextCategory } from '../prompt/index.js';

/**
 * Claude adapter using XML-style formatting.
 * Claude excels at parsing structured XML content.
 */
export class ClaudeAdapter implements ProviderAdapter {
  readonly name = 'claude';

  format(pack: PromptPack): FormattedOutput {
    const parts: string[] = [];

    // Opening context block
    parts.push('<context>');
    parts.push(`<metadata>`);
    parts.push(`  <provider>${pack.manifest.provider}</provider>`);
    parts.push(`  <generated>${pack.manifest.generatedAt}</generated>`);
    parts.push(`  <content_hash>${pack.manifest.contentHash}</content_hash>`);
    parts.push(`  <tokens_used>${pack.manifest.tokens.total}</tokens_used>`);
    parts.push(`  <budget>${pack.manifest.tokens.budget}</budget>`);
    parts.push(`</metadata>`);
    parts.push('');

    // Components affected
    if (pack.manifest.components.names.length > 0) {
      parts.push('<affected_components>');
      for (const name of pack.manifest.components.names) {
        parts.push(`  <component>${name}</component>`);
      }
      parts.push('</affected_components>');
      parts.push('');
    }

    // Sections
    for (const section of pack.sections) {
      parts.push(this.formatSection(section));
      parts.push('');
    }

    parts.push('</context>');

    return {
      content: parts.join('\n'),
      mimeType: 'text/xml',
      extension: '.xml',
      provider: this.name,
    };
  }

  formatSection(section: PromptSection): string {
    const tagName = this.categoryToTag(section.category);
    const parts: string[] = [];

    parts.push(`<${tagName}>`);
    parts.push(`  <title>${this.escapeXml(section.title)}</title>`);
    parts.push(`  <tokens>${section.tokens}</tokens>`);

    if (section.files.length > 0) {
      parts.push('  <files>');
      for (const file of section.files) {
        parts.push(`    <file>${this.escapeXml(file)}</file>`);
      }
      parts.push('  </files>');
    }

    parts.push('  <content>');
    parts.push(this.escapeXml(section.content));
    parts.push('  </content>');
    parts.push(`</${tagName}>`);

    return parts.join('\n');
  }

  private categoryToTag(category: ContextCategory): string {
    const map: Record<ContextCategory, string> = {
      task: 'task_description',
      changed: 'changed_files',
      impacted: 'impacted_files',
      contract: 'contracts',
      architecture: 'architecture',
      decision: 'decisions',
    };
    return map[category] || category;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

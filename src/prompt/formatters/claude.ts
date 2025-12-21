import { PromptFormatter, ContextBundle } from '../types.js';

export class ClaudeFormatter implements PromptFormatter {
  providerName = 'claude';

  format(bundle: ContextBundle): string {
    const parts: string[] = [];

    parts.push('<context>');
    parts.push(`  <generated_at>${bundle.timestamp}</generated_at>`);

    if (bundle.instructions) {
      parts.push('  <instructions>');
      parts.push(`    ${this.escapeXml(bundle.instructions)}`);
      parts.push('  </instructions>');
    }

    parts.push('  <files>');
    for (const file of bundle.files) {
      parts.push(`    <file path="${file.path}">`);
      parts.push(this.escapeXml(file.content));
      parts.push('    </file>');
    }
    parts.push('  </files>');

    parts.push('  <impact_summary>');
    parts.push(`    <affected_components>${bundle.impactReport.affectedComponents.join(', ')}</affected_components>`);
    parts.push(`    <affected_files_count>${bundle.impactReport.summary.filesAffected}</affected_files_count>`);
    parts.push('  </impact_summary>');

    parts.push('</context>');

    return parts.join('\n');
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'\\"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}

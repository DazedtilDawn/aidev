import { PromptFormatter, ContextBundle } from '../types.js';

export class ClaudeFormatter implements PromptFormatter {
  providerName = 'claude';

  format(bundle: ContextBundle, options?: { timestamp?: string }): string {
    const parts: string[] = [];

    const timestamp = options?.timestamp || bundle.timestamp;

    parts.push('<context>');
    parts.push(`  <generated_at>${timestamp}</generated_at>`);

    if (bundle.instructions) {
      parts.push('  <instructions>');
      parts.push(`    ${this.escapeXml(bundle.instructions)}`);
      parts.push('  </instructions>');
    }

    parts.push('  <files>');
    for (const file of bundle.files) {
      const reasonAttr = file.reason ? ` reason="${this.escapeXml(file.reason)}"` : '';
      parts.push(`    <file path="${file.path}"${reasonAttr}>`);
      parts.push(this.escapeXml(file.content));
      parts.push('    </file>');
    }
    parts.push('  </files>');

    parts.push('  <context_map>');
    for (const edge of bundle.impactReport.fileImpactEdges) {
      parts.push(`    <edge source="${edge.source}" target="${edge.target}" type="${edge.type}" confidence="${edge.confidence.toFixed(2)}" />`);
    }
    parts.push('  </context_map>');

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

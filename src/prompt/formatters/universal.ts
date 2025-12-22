import { PromptFormatter, ContextBundle } from '../types.js';

/**
 * A universal XML formatter that supports both full file content
 * and structural skeletons.
 */
export class UniversalFormatter implements PromptFormatter {
  providerName = 'universal';

  format(bundle: ContextBundle, options?: { timestamp?: string }): string {
    const parts: string[] = [];
    const timestamp = options?.timestamp || bundle.timestamp;

    parts.push('<context>');
    parts.push(`  <generated_at>${timestamp}</generated_at>`);

    const instructions = bundle.preset?.content || bundle.instructions;
    if (instructions) {
      parts.push('  <instructions>');
      parts.push(`    ${this.escapeXml(instructions)}`);
      parts.push('  </instructions>');
    }

    parts.push('  <files>');
    for (const file of bundle.files) {
      const reasonAttr = file.reason ? ` reason="${this.escapeXml(file.reason)}"` : '';
      const tag = file.isSkeleton ? 'skeleton' : 'file';
      
      let metadataAttrs = '';
      const metadata = bundle.impactReport.fileMetadata?.[file.path];
      if (metadata) {
        metadataAttrs = ` risk="${metadata.risk}" fan_in="${metadata.fanIn}"`;
      }
      
      parts.push(`    <${tag} path="${file.path}"${reasonAttr}${metadataAttrs}>`);
      parts.push(this.escapeXml(file.content));
      parts.push(`    </${tag}>`);
    }
    parts.push('  </files>');

    parts.push('  <impact_graph>');
    for (const edge of bundle.impactReport.fileImpactEdges) {
      parts.push(`    <edge source="${edge.source}" target="${edge.target}" type="${edge.type}" confidence="${edge.confidence.toFixed(2)}" />`);
    }
    parts.push('  </impact_graph>');

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

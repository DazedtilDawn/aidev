import { BaseAdvisor, CouncilInsight } from './base.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * The Architect: "Why is it shaped this way?"
 * Synthesizes architecture docs and contracts into structural guidance.
 */
export class Architect extends BaseAdvisor {
  name = 'Architect';

  async provideInsights(paths: string[]): Promise<CouncilInsight[]> {
    const insights: CouncilInsight[] = [];
    const projectRoot = process.cwd();

    // Check for global architecture doc
    const archDocPaths = [
      join(projectRoot, 'docs', 'architecture', 'context-engine.md'),
      join(projectRoot, 'ARCHITECTURE.md')
    ];

    for (const docPath of archDocPaths) {
      if (existsSync(docPath)) {
        const content = readFileSync(docPath, 'utf-8');
        // Extract high-level vision/principles (first 500 chars)
        const vision = content.split('\n').slice(0, 10).join('\n');
        
        insights.push({
          advisor: this.name,
          label: 'Architectural Invariants',
          content: vision,
          provenance: docPath
        });
        break; // Only need one high-level doc
      }
    }

    return insights;
  }
}

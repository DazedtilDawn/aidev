import { BaseAdvisor, CouncilInsight } from './base.js';
import { InternalStateManager } from '../../state/index.js';

/**
 * The Historian: "What brought us here?"
 * Reads distilled facts from the Internal State <IS>.
 */
export class Historian extends BaseAdvisor {
  name = 'Historian';
  private stateManager: InternalStateManager;

  constructor() {
    super();
    this.stateManager = new InternalStateManager(process.cwd());
  }

  async provideInsights(paths: string[]): Promise<CouncilInsight[]> {
    const insights: CouncilInsight[] = [];
    const facts = await this.stateManager.getFactsBySource('commit:');

    // Simple heuristic: If a fact mentions a file name, it's relevant
    // In a real system, we'd use semantic search on facts, but keyword matching is fine for the slice
    for (const fact of facts) {
      // Check if any of the requested paths are mentioned in the fact text
      const isRelevant = paths.some(path => {
        const filename = path.split('/').pop();
        return filename && fact['#text'].includes(filename);
      });

      if (isRelevant || fact['@_confidence'] === 'high') {
        insights.push({
          advisor: this.name,
          label: isRelevant ? `Historical Fact (${fact['@_confidence']})` : `General Project History`,
          content: fact['#text'],
          provenance: fact['@_source']
        });
      }
    }

    return insights;
  }
}

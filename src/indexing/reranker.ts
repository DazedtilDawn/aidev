import { VectorEntry } from './store.js';
import { ProjectModel } from '../model/index.js';
import { normalizePath } from '../utils/index.js';

/**
 * Re-ranks semantic search results using the project's structural graph.
 */
export class AnchorReranker {
  constructor(private model: ProjectModel) {}

  /**
   * Re-ranks results based on "Structural Dominance".
   * If File A and B are both in results, and A imports B, A gets a boost.
   */
  rerank(results: VectorEntry[]): VectorEntry[] {
    const reranked = [...results];
    const pathSet = new Set(results.map(r => normalizePath(r.path)));

    for (const entry of reranked) {
      const normalizedPath = normalizePath(entry.path);
      
      // Find files that this entry depends on
      const dependencies = this.model.discoveredEdges
        .filter(edge => normalizePath(edge.source) === normalizedPath)
        .map(edge => normalizePath(edge.target));

      for (const dep of dependencies) {
        if (pathSet.has(dep)) {
          // Boost the source (parent) because it's a higher-level entry point
          entry.score = (entry.score || 0) + 0.05;
        }
      }

      // Boost files that are part of 'components' (declared importance)
      const isComponentFile = this.model.components.some(c => 
        c.paths.some(p => normalizedPath.includes(p.replace(/\*/g, '')))
      );
      if (isComponentFile) {
        entry.score = (entry.score || 0) + 0.03;
      }
    }

    return reranked.sort((a, b) => (b.score || 0) - (a.score || 0));
  }
}

import { minimatch } from 'minimatch';
import { ProjectModel } from '../model/index.js';
import { ChangedFile } from '../git/index.js';

export interface ImpactEdge {
  source: string;
  target: string;
  type: 'direct' | 'transitive';
  confidence: number;
  distance: number;
  reason: string;
}

export interface ImpactReport {
  changedFiles: ChangedFile[];
  affectedComponents: string[];
  impactEdges: ImpactEdge[];
  summary: {
    filesChanged: number;
    componentsAffected: number;
    confidenceMean: number;
  };
}

export class ImpactAnalyzer {
  constructor(private model: ProjectModel) {}

  analyze(changes: ChangedFile[]): ImpactReport {
    const directComponents = this.findDirectComponents(changes);
    const allAffected = this.findTransitiveComponents(directComponents);
    const impactEdges = this.buildImpactEdges(changes, directComponents, allAffected);

    const confidences = impactEdges.map(e => e.confidence);
    const confidenceMean = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    return {
      changedFiles: changes,
      // Sort for deterministic output
      affectedComponents: Array.from(allAffected).sort(),
      impactEdges,
      summary: {
        filesChanged: changes.length,
        componentsAffected: allAffected.size,
        confidenceMean,
      },
    };
  }

  private findDirectComponents(changes: ChangedFile[]): Set<string> {
    const direct = new Set<string>();

    for (const change of changes) {
      for (const component of this.model.components) {
        if (component.paths.some(pattern => minimatch(change.path, pattern))) {
          direct.add(component.name);
        }
      }
    }

    return direct;
  }

  // O(1) lookup using precomputed dependentsByComponent map
  // Fixed per ChatGPT review: use index cursor (O(1)) instead of shift() (O(n))
  // Fixed per ChatGPT review: sort dependents for deterministic traversal order
  private findTransitiveComponents(direct: Set<string>): Set<string> {
    const all = new Set(direct);
    // Sort initial queue for deterministic starting order
    const queue = Array.from(direct).sort();
    let head = 0;

    while (head < queue.length) {
      const current = queue[head]!;
      head += 1;

      // Use reverse lookup map instead of iterating all components
      const dependents = this.model.dependentsByComponent.get(current) ?? [];
      // Sort dependents for deterministic insertion order
      const orderedDependents = dependents.length <= 1 ? dependents : [...dependents].sort();
      for (const dependent of orderedDependents) {
        if (!all.has(dependent)) {
          all.add(dependent);
          queue.push(dependent);
        }
      }
    }

    return all;
  }

  private buildImpactEdges(
    changes: ChangedFile[],
    direct: Set<string>,
    all: Set<string>
  ): ImpactEdge[] {
    const edges: ImpactEdge[] = [];
    const distances = this.calculateDistances(direct);

    for (const componentName of all) {
      const distance = distances.get(componentName) ?? 0;
      const isDirect = direct.has(componentName);
      const confidence = isDirect ? 1.0 : Math.max(0.3, 1.0 - (distance * 0.2));

      edges.push({
        source: isDirect ? changes[0]?.path || 'unknown' : this.findDependencySource(componentName, direct),
        target: componentName,
        type: isDirect ? 'direct' : 'transitive',
        confidence,
        distance,
        reason: isDirect
          ? 'File matches component path pattern'
          : `Depends on affected component (distance: ${distance})`,
      });
    }

    return edges.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateDistances(direct: Set<string>): Map<string, number> {
    const distances = new Map<string, number>();
    // Sort for deterministic processing order
    const queue: [string, number][] = Array.from(direct).sort().map(c => [c, 0]);
    let head = 0;

    while (head < queue.length) {
      const [current, dist] = queue[head]!;
      head += 1;

      if (distances.has(current) && distances.get(current)! <= dist) {
        continue;
      }
      distances.set(current, dist);

      // Use reverse lookup for transitive dependencies
      const dependents = this.model.dependentsByComponent.get(current) ?? [];
      // Sort for deterministic order
      const orderedDependents = dependents.length <= 1 ? dependents : [...dependents].sort();
      for (const dependent of orderedDependents) {
        queue.push([dependent, dist + 1]);
      }
    }

    return distances;
  }

  private findDependencySource(target: string, direct: Set<string>): string {
    const component = this.model.components.find(c => c.name === target);
    if (!component) return 'unknown';

    for (const dep of component.depends_on) {
      if (direct.has(dep)) return dep;
    }
    return component.depends_on[0] || 'unknown';
  }
}

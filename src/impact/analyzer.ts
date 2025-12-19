import { minimatch } from 'minimatch';
import { ProjectModel } from '../model/index.js';
import { ChangedFile } from '../git/index.js';
import { Edge } from '../schemas/edge.js';
import { normalizePath } from '../utils/index.js';

export interface ImpactEdge {
  source: string;
  target: string;
  type: 'direct' | 'transitive';
  confidence: number;
  distance: number;
  reason: string;
}

export interface FileImpactEdge {
  source: string;
  target: string;
  type: Edge['type'];
  confidence: number;
  detection_method: Edge['detection_method'];
  distance: number;
}

export interface ImpactReport {
  changedFiles: ChangedFile[];
  affectedComponents: string[];
  affectedFiles: string[];
  impactEdges: ImpactEdge[];
  fileImpactEdges: FileImpactEdge[];
  summary: {
    filesChanged: number;
    componentsAffected: number;
    filesAffected: number;
    confidenceMean: number;
  };
}

export class ImpactAnalyzer {
  private mergedEdges: Edge[] | null = null;
  private reverseFileEdges: Map<string, Edge[]> | null = null;

  constructor(private model: ProjectModel) {}

  analyze(changes: ChangedFile[]): ImpactReport {
    // Component-level analysis
    const directComponents = this.findDirectComponents(changes);
    const allAffected = this.findTransitiveComponents(directComponents);
    const impactEdges = this.buildImpactEdges(changes, directComponents, allAffected);

    // File-level analysis using discovered edges
    const changedPaths = new Set(changes.map(c => normalizePath(c.path)));
    const { affectedFiles, fileImpactEdges } = this.findAffectedFiles(changedPaths);

    const confidences = impactEdges.map(e => e.confidence);
    const confidenceMean = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    return {
      changedFiles: changes,
      // Sort for deterministic output
      affectedComponents: Array.from(allAffected).sort(),
      affectedFiles: Array.from(affectedFiles).sort(),
      impactEdges,
      fileImpactEdges,
      summary: {
        filesChanged: changes.length,
        componentsAffected: allAffected.size,
        filesAffected: affectedFiles.size,
        confidenceMean,
      },
    };
  }

  /**
   * Get merged edges from declared and discovered sources.
   * Keeps higher confidence version when edges overlap.
   */
  getMergedEdges(): Edge[] {
    if (this.mergedEdges !== null) {
      return this.mergedEdges;
    }

    const edgeMap = new Map<string, Edge>();

    // Add declared edges first (usually higher confidence)
    for (const edge of this.model.declaredEdges) {
      const key = `${normalizePath(edge.source)}|${normalizePath(edge.target)}|${edge.type}`;
      edgeMap.set(key, edge);
    }

    // Merge discovered edges, keeping higher confidence
    for (const edge of this.model.discoveredEdges) {
      const key = `${normalizePath(edge.source)}|${normalizePath(edge.target)}|${edge.type}`;
      const existing = edgeMap.get(key);
      if (!existing || edge.confidence > existing.confidence) {
        edgeMap.set(key, edge);
      }
    }

    // Sort for deterministic output
    this.mergedEdges = Array.from(edgeMap.values()).sort((a, b) => {
      if (a.source !== b.source) return a.source < b.source ? -1 : 1;
      if (a.target !== b.target) return a.target < b.target ? -1 : 1;
      if (a.type !== b.type) return a.type < b.type ? -1 : 1;
      return 0;
    });

    return this.mergedEdges;
  }

  /**
   * Build reverse edge lookup: file -> edges where file is the target.
   * Used to find "what depends on this file" (upstream impact).
   */
  private getReverseFileEdges(): Map<string, Edge[]> {
    if (this.reverseFileEdges !== null) {
      return this.reverseFileEdges;
    }

    this.reverseFileEdges = new Map();
    const allEdges = this.getMergedEdges();

    for (const edge of allEdges) {
      const target = normalizePath(edge.target);
      const existing = this.reverseFileEdges.get(target) || [];
      existing.push(edge);
      this.reverseFileEdges.set(target, existing);
    }

    return this.reverseFileEdges;
  }

  /**
   * Find all files affected by changes using discovered edges.
   * Includes:
   * - Changed files themselves
   * - Files imported by changed files (downstream)
   * - Files that import changed files (upstream)
   * - Transitive dependencies in both directions
   */
  private findAffectedFiles(changedPaths: Set<string>): {
    affectedFiles: Set<string>;
    fileImpactEdges: FileImpactEdge[];
  } {
    const affectedFiles = new Set(changedPaths);
    const fileImpactEdges: FileImpactEdge[] = [];
    const allEdges = this.getMergedEdges();
    const reverseEdges = this.getReverseFileEdges();

    // Build forward edge lookup: source -> edges
    const forwardEdges = new Map<string, Edge[]>();
    for (const edge of allEdges) {
      const source = normalizePath(edge.source);
      const existing = forwardEdges.get(source) || [];
      existing.push(edge);
      forwardEdges.set(source, existing);
    }

    // BFS from changed files - both directions
    const queue: Array<{ file: string; distance: number }> = [];
    for (const path of changedPaths) {
      queue.push({ file: path, distance: 0 });
    }

    const visited = new Set<string>();
    let head = 0;

    while (head < queue.length) {
      const { file, distance } = queue[head]!;
      head++;

      if (visited.has(file)) continue;
      visited.add(file);

      // Forward edges: file imports these files
      const forward = forwardEdges.get(file) || [];
      for (const edge of forward.sort((a, b) => a.target < b.target ? -1 : 1)) {
        const target = normalizePath(edge.target);
        if (!affectedFiles.has(target)) {
          affectedFiles.add(target);
          fileImpactEdges.push({
            source: file,
            target,
            type: edge.type,
            confidence: edge.confidence * Math.max(0.5, 1 - distance * 0.1),
            detection_method: edge.detection_method,
            distance: distance + 1,
          });
          queue.push({ file: target, distance: distance + 1 });
        }
      }

      // Reverse edges: these files import this file (upstream impact)
      const reverse = reverseEdges.get(file) || [];
      for (const edge of reverse.sort((a, b) => a.source < b.source ? -1 : 1)) {
        const source = normalizePath(edge.source);
        if (!affectedFiles.has(source)) {
          affectedFiles.add(source);
          fileImpactEdges.push({
            source: file,
            target: source,
            type: edge.type,
            confidence: edge.confidence * Math.max(0.5, 1 - distance * 0.1),
            detection_method: edge.detection_method,
            distance: distance + 1,
          });
          queue.push({ file: source, distance: distance + 1 });
        }
      }
    }

    // Sort file impact edges for determinism
    fileImpactEdges.sort((a, b) => {
      if (a.source !== b.source) return a.source < b.source ? -1 : 1;
      if (a.target !== b.target) return a.target < b.target ? -1 : 1;
      return 0;
    });

    return { affectedFiles, fileImpactEdges };
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

    // Build mapping of component -> files that matched it
    const componentToFiles = this.mapComponentsToFiles(changes);

    for (const componentName of all) {
      const distance = distances.get(componentName) ?? 0;
      const isDirect = direct.has(componentName);
      const confidence = isDirect ? 1.0 : Math.max(0.3, 1.0 - (distance * 0.2));

      // Use actual matching file(s) for direct components
      const matchingFiles = componentToFiles.get(componentName);
      const source = isDirect
        ? (matchingFiles?.[0] || 'unknown')
        : this.findDependencySource(componentName, direct);

      edges.push({
        source,
        target: componentName,
        type: isDirect ? 'direct' : 'transitive',
        confidence,
        distance,
        reason: isDirect
          ? `File matches component path pattern`
          : `Depends on affected component (distance: ${distance})`,
      });
    }

    return edges.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Map components to the changed files that match their patterns.
   */
  private mapComponentsToFiles(changes: ChangedFile[]): Map<string, string[]> {
    const result = new Map<string, string[]>();

    for (const component of this.model.components) {
      const matchingFiles: string[] = [];
      for (const change of changes) {
        if (component.paths.some(pattern => minimatch(change.path, pattern))) {
          matchingFiles.push(change.path);
        }
      }
      if (matchingFiles.length > 0) {
        // Sort for determinism
        result.set(component.name, matchingFiles.sort());
      }
    }

    return result;
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

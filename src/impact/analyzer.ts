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

/**
 * A single step in an evidence trail showing how impact propagates.
 */
export interface EvidenceNode {
  step: number;
  from: string;
  to: string;
  edgeType: Edge['type'];
  evidence: string | null;
  confidence: number;
  detectionMethod: Edge['detection_method'];
}

/**
 * Complete evidence trail explaining why a file is impacted.
 */
export interface EvidenceTrail {
  targetFile: string;
  impactScore: number;
  isDirectlyChanged: boolean;
  chain: EvidenceNode[];
  summary: string;
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

  /**
   * Generate detailed evidence trail explaining why a specific file is impacted.
   * Uses BFS to find the shortest path from any changed file to the target.
   *
   * @param targetFile - The file to explain impact for
   * @param changes - The changed files that started the impact analysis
   * @returns Evidence trail or null if file is not impacted
   */
  explainImpact(targetFile: string, changes: ChangedFile[]): EvidenceTrail | null {
    const normalizedTarget = normalizePath(targetFile);
    const changedPaths = new Set(changes.map(c => normalizePath(c.path)));

    // Check if target is a directly changed file
    if (changedPaths.has(normalizedTarget)) {
      return {
        targetFile: normalizedTarget,
        impactScore: 1.0,
        isDirectlyChanged: true,
        chain: [],
        summary: `${normalizedTarget} was directly modified.`,
      };
    }

    // BFS to find shortest path from any changed file to target
    const path = this.findShortestPath(changedPaths, normalizedTarget);

    if (!path) {
      return null;
    }

    // Build the evidence chain from the path
    const chain = this.buildEvidenceChain(path);

    // Calculate impact score based on path length and edge confidences
    const impactScore = this.calculatePathImpactScore(chain);

    // Generate human-readable summary
    const summary = this.generateTrailSummary(path, chain, impactScore);

    return {
      targetFile: normalizedTarget,
      impactScore,
      isDirectlyChanged: false,
      chain,
      summary,
    };
  }

  /**
   * Find shortest path from any changed file to target using BFS.
   * Returns array of files in the path, or null if no path exists.
   */
  private findShortestPath(changedPaths: Set<string>, target: string): string[] | null {
    const allEdges = this.getMergedEdges();

    // Build adjacency lists for both directions
    const forwardEdges = new Map<string, string[]>(); // source -> targets
    const reverseEdges = new Map<string, string[]>(); // target -> sources

    for (const edge of allEdges) {
      const src = normalizePath(edge.source);
      const tgt = normalizePath(edge.target);

      // Forward: files that this file imports
      const fwd = forwardEdges.get(src) || [];
      fwd.push(tgt);
      forwardEdges.set(src, fwd);

      // Reverse: files that import this file
      const rev = reverseEdges.get(tgt) || [];
      rev.push(src);
      reverseEdges.set(tgt, rev);
    }

    // BFS from changed files
    const visited = new Map<string, string | null>(); // file -> previous file in path
    const queue: string[] = [];

    for (const changed of changedPaths) {
      visited.set(changed, null);
      queue.push(changed);
    }

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];

      if (current === target) {
        // Reconstruct path
        const path: string[] = [];
        let node: string | null = current;
        while (node !== null) {
          path.unshift(node);
          node = visited.get(node) ?? null;
        }
        return path;
      }

      // Explore forward edges (files this file imports)
      const forward = forwardEdges.get(current) || [];
      for (const next of forward.sort()) {
        if (!visited.has(next)) {
          visited.set(next, current);
          queue.push(next);
        }
      }

      // Explore reverse edges (files that import this file)
      const reverse = reverseEdges.get(current) || [];
      for (const next of reverse.sort()) {
        if (!visited.has(next)) {
          visited.set(next, current);
          queue.push(next);
        }
      }
    }

    return null;
  }

  /**
   * Build evidence chain from a path by looking up edge details.
   */
  private buildEvidenceChain(path: string[]): EvidenceNode[] {
    if (path.length < 2) return [];

    const allEdges = this.getMergedEdges();
    const chain: EvidenceNode[] = [];

    // Build edge lookup for both directions
    const edgeMap = new Map<string, Edge>();
    for (const edge of allEdges) {
      const fwdKey = `${normalizePath(edge.source)}|${normalizePath(edge.target)}`;
      const revKey = `${normalizePath(edge.target)}|${normalizePath(edge.source)}`;
      edgeMap.set(fwdKey, edge);
      edgeMap.set(revKey, edge); // Also store reverse for upstream lookup
    }

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const key = `${from}|${to}`;
      const revKey = `${to}|${from}`;

      // Try forward edge first, then reverse
      const edge = edgeMap.get(key) || edgeMap.get(revKey);

      chain.push({
        step: i + 1,
        from,
        to,
        edgeType: edge?.type || 'import',
        evidence: edge?.evidence || null,
        confidence: edge?.confidence || 0.5,
        detectionMethod: edge?.detection_method || 'heuristic',
      });
    }

    return chain;
  }

  /**
   * Calculate overall impact score based on path length and edge confidences.
   */
  private calculatePathImpactScore(chain: EvidenceNode[]): number {
    if (chain.length === 0) return 1.0;

    // Start with base confidence and decay with distance
    let score = 1.0;

    for (const node of chain) {
      // Multiply by edge confidence with distance decay
      score *= node.confidence * Math.max(0.8, 1 - (node.step - 1) * 0.05);
    }

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate human-readable summary of the evidence trail.
   */
  private generateTrailSummary(path: string[], chain: EvidenceNode[], impactScore: number): string {
    const start = path[0];
    const end = path[path.length - 1];
    const hops = chain.length;

    if (hops === 0) {
      return `${end} was directly modified.`;
    }

    // Get the primary edge type in the chain
    const edgeTypes = [...new Set(chain.map(n => n.edgeType))];
    const primaryType = edgeTypes[0] || 'import';

    const typeDescriptions: Record<string, string> = {
      'import': 'import chain',
      'call': 'call chain',
      'type_reference': 'type reference chain',
      'extends': 'inheritance chain',
      'uses_table': 'database dependency',
      'publishes_event': 'event dependency',
      'calls_endpoint': 'API dependency',
      'reads_config': 'configuration dependency',
      'test_covers': 'test coverage',
    };

    const typeDesc = typeDescriptions[primaryType] || 'dependency chain';

    return `Changes to ${start} propagate to ${end} via ${typeDesc} (${hops} hop${hops > 1 ? 's' : ''}, ${Math.round(impactScore * 100)}% confidence).`;
  }
}

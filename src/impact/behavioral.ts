import { ProjectModel } from '../model/index.js';
import { Edge } from '../schemas/edge.js';
import { normalizePath } from '../utils/index.js';
import path from 'path';

export interface BehavioralEdge extends Omit<Edge, 'metadata'> {
  reason: string;
}

export interface RelationshipRule {
  name: string;
  confidence: number;
  type: Edge['type'];
  match: (source: string, target: string, allFiles: string[]) => string | null;
}

/**
 * Encodes senior developer intuition about how files relate beyond explicit imports.
 */
export class BehavioralAnalyzer {
  private rules: RelationshipRule[] = [
    // 1. Peer Patterns (Tests, Types, Styles)
    {
      name: 'Test Peer',
      confidence: 0.95,
      type: 'test_covers',
      match: (src, tgt) => {
        const srcParsed = path.parse(src);
        const tgtParsed = path.parse(tgt);
        // Handle (name).test.ts, (name).spec.ts, or __tests__/(name).ts
        const isTestMatch = tgt.includes(`${srcParsed.name}.test`) || 
                           tgt.includes(`${srcParsed.name}.spec`) ||
                           (tgt.includes('__tests__') && tgt.includes(srcParsed.base));
        return isTestMatch ? `Test coverage for ${srcParsed.base}` : null;
      }
    },
    {
      name: 'Type Peer',
      confidence: 0.90,
      type: 'type_reference',
      match: (src, tgt) => {
        const srcParsed = path.parse(src);
        return tgt.includes(`${srcParsed.name}.types`) || tgt.includes(`${srcParsed.name}.d.ts`)
          ? `Type definitions for ${srcParsed.base}` : null;
      }
    },
    // 2. Domain/Role Naming (UserService -> UserController)
    {
      name: 'Domain Lattice',
      confidence: 0.75,
      type: 'import',
      match: (src, tgt) => {
        const srcName = path.basename(src);
        const tgtName = path.basename(tgt);
        
        // Extract Domain + Role (e.g. [User][Service])
        const srcMatch = srcName.match(/^([A-Z][a-z0-9]+)([A-Z][a-z0-9]+)/);
        const tgtMatch = tgtName.match(/^([A-Z][a-z0-9]+)([A-Z][a-z0-9]+)/);

        if (srcMatch && tgtMatch && srcMatch[1] === tgtMatch[1]) {
          return `Domain sibling: Both relate to '${srcMatch[1]}' entity`;
        }
        return null;
      }
    },
    // 3. Environment Context (Directory Siblings)
    {
      name: 'Directory Sibling',
      confidence: 0.40,
      type: 'import',
      match: (src, tgt) => {
        const srcDir = path.dirname(src);
        const tgtDir = path.dirname(tgt);
        return srcDir === tgtDir ? 'Shared directory context' : null;
      }
    }
  ];

  constructor(private model: ProjectModel) {}

  /**
   * Discovers intuitive relationships for a set of anchor files.
   */
  findRelatedFiles(anchorPaths: string[]): BehavioralEdge[] {
    const edges: BehavioralEdge[] = [];
    const allFiles = this.model.files.map(f => normalizePath(f.path));

    for (const anchor of anchorPaths) {
      const normalizedAnchor = normalizePath(anchor);
      
      for (const candidate of allFiles) {
        if (normalizedAnchor === candidate) continue;

        for (const rule of this.rules) {
          const reason = rule.match(normalizedAnchor, candidate, allFiles);
          if (reason) {
            edges.push({
              source: normalizedAnchor,
              target: candidate,
              type: rule.type,
              confidence: rule.confidence,
              detection_method: 'heuristic',
              reason: `[${rule.name}] ${reason}`
            });
            // Stop after first matching rule for this candidate to avoid noise
            break; 
          }
        }
      }
    }

    return edges;
  }
}
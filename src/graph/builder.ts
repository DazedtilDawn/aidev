import { ScanResult } from '../scanners/index.js';
import { Edge } from '../schemas/edge.js';
import { normalizePath } from '../utils/index.js';

interface FileInfo {
  path: string;
  scanResult: ScanResult;
}

/**
 * Builds a discovered dependency graph from scan results.
 * Resolves import paths to actual files and creates edges with confidence scores.
 */
export class GraphBuilder {
  private files: Map<string, FileInfo> = new Map();

  /**
   * Add scan results for a file.
   * @param path - Normalized file path (use forward slashes)
   * @param result - Scan results from a language scanner
   */
  addScanResult(path: string, result: ScanResult): void {
    const normalizedPath = normalizePath(path);
    this.files.set(normalizedPath, { path: normalizedPath, scanResult: result });
  }

  /**
   * Build edges from all added scan results.
   * @returns Array of edges sorted deterministically by (source, target)
   */
  buildEdges(): Edge[] {
    const edges: Edge[] = [];

    // Sort file keys for deterministic iteration
    const sortedPaths = Array.from(this.files.keys()).sort();

    for (const sourcePath of sortedPaths) {
      const sourceInfo = this.files.get(sourcePath)!;

      for (const imp of sourceInfo.scanResult.imports) {
        // Skip external packages (not relative imports)
        if (!this.isRelativeImport(imp.source)) {
          continue;
        }

        const targetPath = this.resolveImportPath(sourcePath, imp.source);
        if (targetPath && this.files.has(targetPath)) {
          edges.push({
            source: sourcePath,
            target: targetPath,
            type: 'import',
            confidence: 0.95, // AST-verified import
            detection_method: 'ast',
            evidence: `import from '${imp.source}'`,
          });
        }
      }
    }

    // Sort edges for determinism: by source, then target
    return edges.sort((a, b) => {
      if (a.source !== b.source) return a.source < b.source ? -1 : 1;
      if (a.target !== b.target) return a.target < b.target ? -1 : 1;
      return 0;
    });
  }

  /**
   * Check if an import source is a relative import (starts with . or ..)
   */
  private isRelativeImport(source: string): boolean {
    return source.startsWith('./') || source.startsWith('../') || source === '.' || source === '..';
  }

  /**
   * Resolve an import path to an actual file path.
   * Handles:
   * - Relative paths (./foo, ../bar)
   * - Extension inference (.ts, .tsx, .js, etc.)
   * - Index file resolution (./dir -> ./dir/index.ts)
   */
  private resolveImportPath(fromPath: string, importSource: string): string | null {
    const fromDir = this.dirname(fromPath);

    // Resolve the relative path manually (to keep paths relative)
    const resolved = this.resolvePath(fromDir, importSource);

    // Common extensions to try (in priority order)
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.pyi', ''];

    // Try direct file with extensions
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (this.files.has(withExt)) {
        return withExt;
      }
    }

    // Try index file in directory
    for (const ext of extensions) {
      if (!ext) continue; // Skip empty extension for index files
      const indexPath = this.joinPath(resolved, `index${ext}`);
      if (this.files.has(indexPath)) {
        return indexPath;
      }
    }

    return null;
  }

  /**
   * Get directory name from a path (pure string manipulation, no fs).
   */
  private dirname(path: string): string {
    const normalized = normalizePath(path);
    const lastSlash = normalized.lastIndexOf('/');
    if (lastSlash === -1) return '.';
    if (lastSlash === 0) return '/';
    return normalized.substring(0, lastSlash);
  }

  /**
   * Join path segments (pure string manipulation).
   */
  private joinPath(...segments: string[]): string {
    return normalizePath(segments.join('/'));
  }

  /**
   * Resolve a relative path from a base directory.
   * Handles . and .. segments.
   */
  private resolvePath(fromDir: string, relativePath: string): string {
    const normalizedFrom = normalizePath(fromDir);
    const normalizedRel = normalizePath(relativePath);

    // Split into segments
    const fromParts = normalizedFrom === '.' ? [] : normalizedFrom.split('/').filter(Boolean);
    const relParts = normalizedRel.split('/').filter(Boolean);

    // Process relative path segments
    const resultParts = [...fromParts];
    for (const part of relParts) {
      if (part === '.') {
        // Current directory, skip
        continue;
      } else if (part === '..') {
        // Parent directory
        if (resultParts.length > 0) {
          resultParts.pop();
        }
      } else {
        resultParts.push(part);
      }
    }

    return resultParts.join('/') || '.';
  }

  /**
   * Get all files that have been added.
   */
  getFiles(): string[] {
    return Array.from(this.files.keys()).sort();
  }

  /**
   * Clear all added scan results.
   */
  clear(): void {
    this.files.clear();
  }
}

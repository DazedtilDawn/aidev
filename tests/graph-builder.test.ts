import { describe, it, expect } from 'vitest';
import { GraphBuilder } from '../src/graph/builder.js';

describe('GraphBuilder', () => {
  describe('edge building', () => {
    it('builds edges from scan results', () => {
      const builder = new GraphBuilder();

      builder.addScanResult('src/api/handler.ts', {
        imports: [{
          source: './utils',
          symbols: ['helper'],
          isDefault: false,
          isNamespace: false,
          line: 1,
        }],
        exports: ['handleRequest'],
        calls: ['helper'],
        typeReferences: [],
      });

      builder.addScanResult('src/api/utils.ts', {
        imports: [],
        exports: ['helper'],
        calls: [],
        typeReferences: [],
      });

      const edges = builder.buildEdges();

      expect(edges).toContainEqual(expect.objectContaining({
        source: 'src/api/handler.ts',
        target: 'src/api/utils.ts',
        type: 'import',
        confidence: 0.95,
        detection_method: 'ast',
      }));
    });

    it('resolves relative imports correctly', () => {
      const builder = new GraphBuilder();

      builder.addScanResult('src/features/auth/login.ts', {
        imports: [{
          source: '../../shared/utils',
          symbols: ['format'],
          isDefault: false,
          isNamespace: false,
          line: 1,
        }],
        exports: ['login'],
        calls: [],
        typeReferences: [],
      });

      builder.addScanResult('src/shared/utils.ts', {
        imports: [],
        exports: ['format'],
        calls: [],
        typeReferences: [],
      });

      const edges = builder.buildEdges();

      expect(edges.some(e =>
        e.source === 'src/features/auth/login.ts' &&
        e.target === 'src/shared/utils.ts'
      )).toBe(true);
    });

    it('resolves index file imports', () => {
      const builder = new GraphBuilder();

      builder.addScanResult('src/app.ts', {
        imports: [{
          source: './components',
          symbols: ['Button'],
          isDefault: false,
          isNamespace: false,
          line: 1,
        }],
        exports: [],
        calls: [],
        typeReferences: [],
      });

      builder.addScanResult('src/components/index.ts', {
        imports: [],
        exports: ['Button'],
        calls: [],
        typeReferences: [],
      });

      const edges = builder.buildEdges();

      expect(edges.some(e =>
        e.source === 'src/app.ts' &&
        e.target === 'src/components/index.ts'
      )).toBe(true);
    });

    it('ignores external package imports', () => {
      const builder = new GraphBuilder();

      builder.addScanResult('src/app.ts', {
        imports: [
          { source: 'react', symbols: ['useState'], isDefault: false, isNamespace: false, line: 1 },
          { source: '@types/node', symbols: ['Buffer'], isDefault: false, isNamespace: false, line: 2 },
          { source: './local', symbols: ['helper'], isDefault: false, isNamespace: false, line: 3 },
        ],
        exports: [],
        calls: [],
        typeReferences: [],
      });

      builder.addScanResult('src/local.ts', {
        imports: [],
        exports: ['helper'],
        calls: [],
        typeReferences: [],
      });

      const edges = builder.buildEdges();

      // Should only have edge to local file, not to external packages
      expect(edges).toHaveLength(1);
      expect(edges[0].target).toBe('src/local.ts');
    });
  });

  describe('confidence scoring', () => {
    it('assigns high confidence to AST-verified imports', () => {
      const builder = new GraphBuilder();

      builder.addScanResult('a.ts', {
        imports: [{ source: './b', symbols: ['x'], isDefault: false, isNamespace: false, line: 1 }],
        exports: [],
        calls: [],
        typeReferences: [],
      });

      builder.addScanResult('b.ts', {
        imports: [],
        exports: ['x'],
        calls: [],
        typeReferences: [],
      });

      const edges = builder.buildEdges();
      const edge = edges.find(e => e.source === 'a.ts' && e.target === 'b.ts');

      expect(edge?.confidence).toBe(0.95);
      expect(edge?.detection_method).toBe('ast');
    });
  });

  describe('determinism', () => {
    it('produces consistent edge order', () => {
      const builder1 = new GraphBuilder();
      const builder2 = new GraphBuilder();

      // Add files in different orders
      builder1.addScanResult('c.ts', { imports: [{ source: './a', symbols: ['x'], isDefault: false, isNamespace: false, line: 1 }], exports: [], calls: [], typeReferences: [] });
      builder1.addScanResult('b.ts', { imports: [{ source: './a', symbols: ['y'], isDefault: false, isNamespace: false, line: 1 }], exports: [], calls: [], typeReferences: [] });
      builder1.addScanResult('a.ts', { imports: [], exports: ['x', 'y'], calls: [], typeReferences: [] });

      builder2.addScanResult('a.ts', { imports: [], exports: ['x', 'y'], calls: [], typeReferences: [] });
      builder2.addScanResult('b.ts', { imports: [{ source: './a', symbols: ['y'], isDefault: false, isNamespace: false, line: 1 }], exports: [], calls: [], typeReferences: [] });
      builder2.addScanResult('c.ts', { imports: [{ source: './a', symbols: ['x'], isDefault: false, isNamespace: false, line: 1 }], exports: [], calls: [], typeReferences: [] });

      const edges1 = builder1.buildEdges();
      const edges2 = builder2.buildEdges();

      expect(edges1).toEqual(edges2);
    });
  });

  describe('edge cases', () => {
    it('handles empty scan results', () => {
      const builder = new GraphBuilder();
      builder.addScanResult('empty.ts', { imports: [], exports: [], calls: [], typeReferences: [] });
      const edges = builder.buildEdges();
      expect(edges).toHaveLength(0);
    });

    it('handles circular imports', () => {
      const builder = new GraphBuilder();

      builder.addScanResult('a.ts', {
        imports: [{ source: './b', symbols: ['funcB'], isDefault: false, isNamespace: false, line: 1 }],
        exports: ['funcA'],
        calls: [],
        typeReferences: [],
      });

      builder.addScanResult('b.ts', {
        imports: [{ source: './a', symbols: ['funcA'], isDefault: false, isNamespace: false, line: 1 }],
        exports: ['funcB'],
        calls: [],
        typeReferences: [],
      });

      const edges = builder.buildEdges();

      // Should have both edges (circular)
      expect(edges.some(e => e.source === 'a.ts' && e.target === 'b.ts')).toBe(true);
      expect(edges.some(e => e.source === 'b.ts' && e.target === 'a.ts')).toBe(true);
    });

    it('handles unresolved imports gracefully', () => {
      const builder = new GraphBuilder();

      builder.addScanResult('orphan.ts', {
        imports: [{ source: './nonexistent', symbols: ['x'], isDefault: false, isNamespace: false, line: 1 }],
        exports: [],
        calls: [],
        typeReferences: [],
      });

      // Should not throw, just return no edges
      const edges = builder.buildEdges();
      expect(edges).toHaveLength(0);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { ImpactAnalyzer } from '../src/impact/analyzer.js';
import { ProjectModel } from '../src/model/index.js';
import { ChangedFile } from '../src/git/index.js';

describe('ImpactAnalyzer', () => {
  // Mock model with precomputed reverse dependency map
  const mockModel: ProjectModel = {
    config: { version: '1.0.0', scan: { exclude: [], max_files: 10000 }, providers: { default: 'claude', token_budgets: {} } },
    components: [
      { name: 'auth', paths: ['src/auth/**'], depends_on: ['database'], contracts: [] },
      { name: 'database', paths: ['src/db/**'], depends_on: [], contracts: [] },
      { name: 'api', paths: ['src/api/**'], depends_on: ['auth'], contracts: [] },
    ],
    declaredEdges: [],
    discoveredEdges: [],
    // Reverse map: who depends on each component
    dependentsByComponent: new Map([
      ['database', ['auth']],    // auth depends on database
      ['auth', ['api']],         // api depends on auth
      ['api', []],               // nothing depends on api
    ]),
  };

  it('identifies directly affected components', () => {
    const changes: ChangedFile[] = [{ path: 'src/auth/login.ts', changeType: 'modified' }];
    const analyzer = new ImpactAnalyzer(mockModel);
    const report = analyzer.analyze(changes);

    expect(report.affectedComponents).toContain('auth');
  });

  it('identifies transitively affected components', () => {
    const changes: ChangedFile[] = [{ path: 'src/db/connection.ts', changeType: 'modified' }];
    const analyzer = new ImpactAnalyzer(mockModel);
    const report = analyzer.analyze(changes);

    expect(report.affectedComponents).toContain('database');
    expect(report.affectedComponents).toContain('auth'); // depends on database
    expect(report.affectedComponents).toContain('api');  // depends on auth
  });

  it('calculates confidence scores', () => {
    const changes: ChangedFile[] = [{ path: 'src/auth/login.ts', changeType: 'modified' }];
    const analyzer = new ImpactAnalyzer(mockModel);
    const report = analyzer.analyze(changes);

    const authEdge = report.impactEdges.find(e => e.target === 'auth');
    expect(authEdge?.confidence).toBe(1.0); // direct match

    const apiEdge = report.impactEdges.find(e => e.target === 'api');
    expect(apiEdge?.confidence).toBeLessThan(1.0); // transitive
  });

  it('returns summary statistics', () => {
    const changes: ChangedFile[] = [
      { path: 'src/auth/login.ts', changeType: 'modified' },
      { path: 'src/auth/logout.ts', changeType: 'added' },
    ];
    const analyzer = new ImpactAnalyzer(mockModel);
    const report = analyzer.analyze(changes);

    expect(report.summary.filesChanged).toBe(2);
    expect(report.summary.componentsAffected).toBeGreaterThan(0);
  });

  it('handles files not matching any component', () => {
    const changes: ChangedFile[] = [{ path: 'README.md', changeType: 'modified' }];
    const analyzer = new ImpactAnalyzer(mockModel);
    const report = analyzer.analyze(changes);

    expect(report.affectedComponents).toHaveLength(0);
    expect(report.summary.componentsAffected).toBe(0);
  });

  // Edge cases from ChatGPT review
  it('handles cycles in dependency graph without infinite loop', () => {
    const cyclicModel: ProjectModel = {
      config: { version: '1.0.0', scan: { exclude: [], max_files: 10000 }, providers: { default: 'claude', token_budgets: {} } },
      components: [
        { name: 'a', paths: ['src/a/**'], depends_on: ['b'], contracts: [] },
        { name: 'b', paths: ['src/b/**'], depends_on: ['a'], contracts: [] }, // cycle: a <-> b
      ],
      declaredEdges: [],
      discoveredEdges: [],
      dependentsByComponent: new Map([
        ['a', ['b']], // b depends on a
        ['b', ['a']], // a depends on b (cycle)
      ]),
    };

    const changes: ChangedFile[] = [{ path: 'src/a/file.ts', changeType: 'modified' }];
    const analyzer = new ImpactAnalyzer(cyclicModel);
    const report = analyzer.analyze(changes);

    // Should terminate and include both
    expect(report.affectedComponents).toContain('a');
    expect(report.affectedComponents).toContain('b');
    expect(report.affectedComponents).toHaveLength(2);
  });

  it('handles self-loops without duplication', () => {
    const selfLoopModel: ProjectModel = {
      config: { version: '1.0.0', scan: { exclude: [], max_files: 10000 }, providers: { default: 'claude', token_budgets: {} } },
      components: [
        { name: 'recursive', paths: ['src/recursive/**'], depends_on: ['recursive'], contracts: [] },
      ],
      declaredEdges: [],
      discoveredEdges: [],
      dependentsByComponent: new Map([
        ['recursive', ['recursive']], // self-loop
      ]),
    };

    const changes: ChangedFile[] = [{ path: 'src/recursive/file.ts', changeType: 'modified' }];
    const analyzer = new ImpactAnalyzer(selfLoopModel);
    const report = analyzer.analyze(changes);

    // Should not duplicate or infinite loop
    expect(report.affectedComponents).toHaveLength(1);
    expect(report.affectedComponents).toContain('recursive');
  });

  it('produces deterministic output regardless of adjacency list order', () => {
    // Two models with same graph but different insertion order
    const model1: ProjectModel = {
      config: { version: '1.0.0', scan: { exclude: [], max_files: 10000 }, providers: { default: 'claude', token_budgets: {} } },
      components: [
        { name: 'core', paths: ['src/core/**'], depends_on: [], contracts: [] },
        { name: 'x', paths: ['src/x/**'], depends_on: ['core'], contracts: [] },
        { name: 'y', paths: ['src/y/**'], depends_on: ['core'], contracts: [] },
        { name: 'z', paths: ['src/z/**'], depends_on: ['core'], contracts: [] },
      ],
      declaredEdges: [],
      discoveredEdges: [],
      dependentsByComponent: new Map([
        ['core', ['z', 'y', 'x']], // reverse alphabetical
        ['x', []],
        ['y', []],
        ['z', []],
      ]),
    };

    const model2: ProjectModel = {
      config: { version: '1.0.0', scan: { exclude: [], max_files: 10000 }, providers: { default: 'claude', token_budgets: {} } },
      components: [
        { name: 'core', paths: ['src/core/**'], depends_on: [], contracts: [] },
        { name: 'x', paths: ['src/x/**'], depends_on: ['core'], contracts: [] },
        { name: 'y', paths: ['src/y/**'], depends_on: ['core'], contracts: [] },
        { name: 'z', paths: ['src/z/**'], depends_on: ['core'], contracts: [] },
      ],
      declaredEdges: [],
      discoveredEdges: [],
      dependentsByComponent: new Map([
        ['core', ['x', 'y', 'z']], // alphabetical order
        ['x', []],
        ['y', []],
        ['z', []],
      ]),
    };

    const changes: ChangedFile[] = [{ path: 'src/core/file.ts', changeType: 'modified' }];

    const report1 = new ImpactAnalyzer(model1).analyze(changes);
    const report2 = new ImpactAnalyzer(model2).analyze(changes);

    // Output must be identical regardless of input order
    expect(report1.affectedComponents).toEqual(report2.affectedComponents);
    expect(report1.impactEdges.map(e => e.target)).toEqual(report2.impactEdges.map(e => e.target));
  });

  it('handles multiple starting nodes deterministically', () => {
    const changes: ChangedFile[] = [
      { path: 'src/auth/login.ts', changeType: 'modified' },
      { path: 'src/db/connection.ts', changeType: 'modified' },
    ];
    const analyzer = new ImpactAnalyzer(mockModel);

    // Run multiple times
    const results = Array(5).fill(null).map(() => analyzer.analyze(changes));

    // All runs should produce identical output
    const first = JSON.stringify(results[0].affectedComponents);
    for (const r of results) {
      expect(JSON.stringify(r.affectedComponents)).toBe(first);
    }
  });

  describe('hybrid edge analysis', () => {
    it('includes file-level impact from discovered edges', () => {
      const modelWithDiscovered: ProjectModel = {
        ...mockModel,
        discoveredEdges: [
          {
            source: 'src/auth/login.ts',
            target: 'src/utils/crypto.ts',
            type: 'import',
            confidence: 0.95,
            detection_method: 'ast',
          },
        ],
      };

      const changes: ChangedFile[] = [{ path: 'src/auth/login.ts', changeType: 'modified' }];
      const analyzer = new ImpactAnalyzer(modelWithDiscovered);
      const report = analyzer.analyze(changes);

      // Should include file-level impact from discovered edges
      expect(report.affectedFiles).toContain('src/utils/crypto.ts');
    });

    it('includes files that import the changed file', () => {
      const modelWithDiscovered: ProjectModel = {
        ...mockModel,
        discoveredEdges: [
          {
            source: 'src/api/handler.ts',
            target: 'src/auth/login.ts',
            type: 'import',
            confidence: 0.95,
            detection_method: 'ast',
          },
        ],
      };

      const changes: ChangedFile[] = [{ path: 'src/auth/login.ts', changeType: 'modified' }];
      const analyzer = new ImpactAnalyzer(modelWithDiscovered);
      const report = analyzer.analyze(changes);

      // handler.ts imports login.ts, so handler.ts is affected
      expect(report.affectedFiles).toContain('src/api/handler.ts');
    });

    it('merges declared and discovered edges, keeping higher confidence', () => {
      const modelWithBoth: ProjectModel = {
        ...mockModel,
        declaredEdges: [
          { source: 'src/a.ts', target: 'src/b.ts', type: 'import', confidence: 1.0, detection_method: 'declared' },
        ],
        discoveredEdges: [
          { source: 'src/a.ts', target: 'src/b.ts', type: 'import', confidence: 0.7, detection_method: 'regex' },
        ],
      };

      const analyzer = new ImpactAnalyzer(modelWithBoth);
      const merged = analyzer.getMergedEdges();

      // Should keep higher confidence version
      const edge = merged.find(e => e.source === 'src/a.ts' && e.target === 'src/b.ts');
      expect(edge?.confidence).toBe(1.0);
      expect(edge?.detection_method).toBe('declared');
    });

    it('includes both directions of discovered edges', () => {
      const modelWithDiscovered: ProjectModel = {
        ...mockModel,
        discoveredEdges: [
          { source: 'src/auth/login.ts', target: 'src/utils/crypto.ts', type: 'import', confidence: 0.95, detection_method: 'ast' },
          { source: 'src/api/handler.ts', target: 'src/auth/login.ts', type: 'import', confidence: 0.95, detection_method: 'ast' },
        ],
      };

      const changes: ChangedFile[] = [{ path: 'src/auth/login.ts', changeType: 'modified' }];
      const analyzer = new ImpactAnalyzer(modelWithDiscovered);
      const report = analyzer.analyze(changes);

      // login.ts imports crypto.ts (downstream)
      expect(report.affectedFiles).toContain('src/utils/crypto.ts');
      // handler.ts imports login.ts (upstream - files that depend on changed file)
      expect(report.affectedFiles).toContain('src/api/handler.ts');
    });

    it('calculates transitive file impact', () => {
      const modelWithDiscovered: ProjectModel = {
        ...mockModel,
        discoveredEdges: [
          { source: 'src/auth/login.ts', target: 'src/utils/crypto.ts', type: 'import', confidence: 0.95, detection_method: 'ast' },
          { source: 'src/utils/crypto.ts', target: 'src/utils/base64.ts', type: 'import', confidence: 0.95, detection_method: 'ast' },
        ],
      };

      const changes: ChangedFile[] = [{ path: 'src/auth/login.ts', changeType: 'modified' }];
      const analyzer = new ImpactAnalyzer(modelWithDiscovered);
      const report = analyzer.analyze(changes);

      // Transitive: login.ts -> crypto.ts -> base64.ts
      expect(report.affectedFiles).toContain('src/utils/crypto.ts');
      expect(report.affectedFiles).toContain('src/utils/base64.ts');
    });

    it('includes changed files in affectedFiles', () => {
      const changes: ChangedFile[] = [{ path: 'src/auth/login.ts', changeType: 'modified' }];
      const analyzer = new ImpactAnalyzer(mockModel);
      const report = analyzer.analyze(changes);

      expect(report.affectedFiles).toContain('src/auth/login.ts');
    });
  });
});

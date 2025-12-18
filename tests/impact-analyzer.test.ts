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
});

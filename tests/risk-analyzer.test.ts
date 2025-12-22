import { describe, it, expect } from 'vitest';
import { ImpactAnalyzer } from '../src/impact/analyzer.js';
import { ProjectModel } from '../src/model/index.js';
import { ChangedFile } from '../src/git/index.js';

describe('Risk Analysis in ImpactAnalyzer', () => {
  const baseModel: ProjectModel = {
    config: { version: '1.0.0', scan: { exclude: [], max_files: 10000 }, providers: { default: 'claude', token_budgets: {} } },
    components: [],
    declaredEdges: [],
    discoveredEdges: [],
    dependentsByComponent: new Map(),
  };

  it('calculates fan-in and risk correctly', () => {
    const model: ProjectModel = {
      ...baseModel,
      discoveredEdges: [
        // 6 files depend on 'core.ts' -> HIGH risk (fanIn > 5)
        { source: 'a.ts', target: 'core.ts', type: 'import', confidence: 1, detection_method: 'ast' },
        { source: 'b.ts', target: 'core.ts', type: 'import', confidence: 1, detection_method: 'ast' },
        { source: 'c.ts', target: 'core.ts', type: 'import', confidence: 1, detection_method: 'ast' },
        { source: 'd.ts', target: 'core.ts', type: 'import', confidence: 1, detection_method: 'ast' },
        { source: 'e.ts', target: 'core.ts', type: 'import', confidence: 1, detection_method: 'ast' },
        { source: 'f.ts', target: 'core.ts', type: 'import', confidence: 1, detection_method: 'ast' },
        
        // 3 files depend on 'utils.ts' -> MEDIUM risk (2 < fanIn <= 5)
        { source: 'x.ts', target: 'utils.ts', type: 'import', confidence: 1, detection_method: 'ast' },
        { source: 'y.ts', target: 'utils.ts', type: 'import', confidence: 1, detection_method: 'ast' },
        { source: 'z.ts', target: 'utils.ts', type: 'import', confidence: 1, detection_method: 'ast' },

        // 1 file depends on 'leaf.ts' -> LOW risk
        { source: 'main.ts', target: 'leaf.ts', type: 'import', confidence: 1, detection_method: 'ast' },

        // Make utils.ts and leaf.ts affected by core.ts
        { source: 'core.ts', target: 'utils.ts', type: 'import', confidence: 1, detection_method: 'ast' },
        { source: 'utils.ts', target: 'leaf.ts', type: 'import', confidence: 1, detection_method: 'ast' },
      ],
    };

    const changes: ChangedFile[] = [{ path: 'core.ts', changeType: 'modified' }];
    const analyzer = new ImpactAnalyzer(model);
    const report = analyzer.analyze(changes);

    expect(report.fileMetadata!['core.ts']).toMatchObject({ fanIn: 6, risk: 'high' });
    expect(report.fileMetadata!['utils.ts']).toMatchObject({ fanIn: 4, risk: 'medium' });
    expect(report.fileMetadata!['leaf.ts']).toMatchObject({ fanIn: 2, risk: 'low' });
  });
});

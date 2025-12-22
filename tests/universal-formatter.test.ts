import { describe, it, expect } from 'vitest';
import { UniversalFormatter } from '../src/prompt/formatters/universal';
import { ContextBundle } from '../src/prompt/types';

describe('UniversalFormatter', () => {
  const mockBundle: ContextBundle = {
    timestamp: '2025-12-21T00:00:00Z',
    impactReport: {
      changedFiles: [],
      affectedComponents: ['core'],
      affectedFiles: [],
      impactEdges: [],
      fileImpactEdges: [],
      summary: {
        filesChanged: 0,
        componentsAffected: 1,
        filesAffected: 0,
        confidenceMean: 1.0,
      },
    },
    files: [
      {
        path: 'src/main.ts',
        content: 'export function main() { console.log("hi"); }',
        isSkeleton: false,
      },
      {
        path: 'src/utils.ts',
        content: 'export function help() {}',
        isSkeleton: true,
        reason: 'Dependency',
      },
    ],
    instructions: 'Test universal output',
  };

  it('should use <file> for full files and <skeleton> for skeletons', () => {
    const formatter = new UniversalFormatter();
    const result = formatter.format(mockBundle) as string;

    expect(result).toContain('<file path="src/main.ts">');
    expect(result).toContain('export function main() { console.log(&quot;hi&quot;); }');
    expect(result).toContain('</file>');

    expect(result).toContain('<skeleton path="src/utils.ts" reason="Dependency">');
    expect(result).toContain('export function help() {}');
    expect(result).toContain('</skeleton>');
  });

  it('should include impact graph and summary', () => {
    const bundleWithEdges: ContextBundle = {
      ...mockBundle,
      impactReport: {
        ...mockBundle.impactReport,
        fileImpactEdges: [
          { source: 'src/main.ts', target: 'src/utils.ts', type: 'import', confidence: 0.9 }
        ]
      }
    };
    const formatter = new UniversalFormatter();
    const result = formatter.format(bundleWithEdges) as string;

    expect(result).toContain('<impact_graph>');
    expect(result).toContain('<edge source="src/main.ts" target="src/utils.ts" type="import" confidence="0.90" />');
    expect(result).toContain('</impact_graph>');
    expect(result).toContain('<affected_components>core</affected_components>');
  });
});

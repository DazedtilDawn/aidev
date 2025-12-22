import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { PromptPackGenerator } from '../src/prompt/generator.js';
import { ImpactReport } from '../src/impact/index.js';

const TEST_DIR = 'C:\\dev\\AIDEV\\tests\\fixtures\\skeleton-generator-test';

describe('Skeleton Integration in PromptPackGenerator', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, 'src'), { recursive: true });

    // Changed file
    writeFileSync(join(TEST_DIR, 'src', 'main.ts'), `
import { helper } from './utils';
export function main() {
  return helper();
}
`);
    // Impacted file (dependency)
    writeFileSync(join(TEST_DIR, 'src', 'utils.ts'), `
export function helper() {
  console.log("doing something complex");
  return 42;
}
`);
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  const mockReport: ImpactReport = {
    changedFiles: [{ path: 'src/main.ts', changeType: 'modified' }],
    affectedComponents: ['core'],
    affectedFiles: ['src/main.ts', 'src/utils.ts'],
    impactEdges: [],
    fileImpactEdges: [
      { source: 'src/main.ts', target: 'src/utils.ts', type: 'import', confidence: 1.0, distance: 1 }
    ],
    summary: {
      filesChanged: 1,
      componentsAffected: 1,
      filesAffected: 2,
      confidenceMean: 1.0,
    },
  };

  it('uses skeletons for impacted files when useSkeletons is true', async () => {
    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'universal',
      budget: 10000,
      useSkeletons: true,
    });

    const pack = await generator.generate(mockReport);
    const content = pack.content as string;

    // main.ts should be a full <file>
    expect(content).toContain('<file path="src/main.ts"');
    expect(content).toContain('return helper();');

    // utils.ts should be a <skeleton>
    expect(content).toContain('<skeleton path="src/utils.ts"');
    // Implementation detail should be stripped
    expect(content).not.toContain('console.log("doing something complex")');
    expect(content).toContain('export function helper() {}');
  });

  it('does NOT use skeletons when useSkeletons is false', async () => {
    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'universal',
      budget: 10000,
      useSkeletons: false,
    });

    const pack = await generator.generate(mockReport);
    const content = pack.content as string;

    // utils.ts should be a full <file>
    expect(content).toContain('<file path="src/utils.ts"');
    expect(content).toContain('console.log(&quot;doing something complex&quot;)');
  });
});

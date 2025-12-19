import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { PromptPackGenerator } from '../src/prompt/generator.js';
import { ImpactReport } from '../src/impact/index.js';

const TEST_DIR = 'C:\\dev\\AIDEV\\tests\\fixtures\\generator-test';

describe('PromptPackGenerator', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, 'src', 'auth'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'src', 'utils'), { recursive: true });
    mkdirSync(join(TEST_DIR, '.aidev', 'docs'), { recursive: true });

    // Create test files
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'login.ts'), `
export function login(user: string, password: string) {
  return authenticate(user, password);
}
`);
    writeFileSync(join(TEST_DIR, 'src', 'utils', 'crypto.ts'), `
export function hash(input: string): string {
  return input.split('').reverse().join('');
}
`);
    writeFileSync(join(TEST_DIR, '.aidev', 'docs', 'architecture.md'), `
# Architecture

This is the system architecture document.
`);
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  const mockReport: ImpactReport = {
    changedFiles: [
      { path: 'src/auth/login.ts', changeType: 'modified' },
    ],
    affectedComponents: ['auth'],
    affectedFiles: ['src/auth/login.ts', 'src/utils/crypto.ts'],
    impactEdges: [
      { source: 'src/auth/login.ts', target: 'auth', type: 'direct', confidence: 1.0, distance: 0, reason: 'Direct match' },
    ],
    fileImpactEdges: [
      { source: 'src/auth/login.ts', target: 'src/utils/crypto.ts', type: 'import', confidence: 0.95, detection_method: 'ast', distance: 1 },
    ],
    summary: {
      filesChanged: 1,
      componentsAffected: 1,
      filesAffected: 2,
      confidenceMean: 1.0,
    },
  };

  it('generates manifest with correct structure', async () => {
    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'claude',
      budget: 10000,
    });

    const pack = await generator.generate(mockReport);

    expect(pack.manifest.version).toBe('1.0.0');
    expect(pack.manifest.provider).toBe('claude');
    expect(pack.manifest.tokens.budget).toBe(10000);
    expect(pack.manifest.tokens.total).toBeLessThanOrEqual(10000);
    expect(pack.manifest.tokens.utilization).toBeGreaterThan(0);
    expect(pack.manifest.tokens.utilization).toBeLessThanOrEqual(1);
  });

  it('includes changed files in output', async () => {
    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'claude',
      budget: 10000,
    });

    const pack = await generator.generate(mockReport);

    expect(pack.content).toContain('src/auth/login.ts');
    expect(pack.content).toContain('login');
    expect(pack.content).toContain('authenticate');
  });

  it('includes impacted files in output', async () => {
    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'claude',
      budget: 10000,
    });

    const pack = await generator.generate(mockReport);

    expect(pack.content).toContain('src/utils/crypto.ts');
    expect(pack.content).toContain('hash');
  });

  it('includes task description when provided', async () => {
    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'claude',
      budget: 10000,
      taskDescription: 'Fix the login authentication bug',
    });

    const pack = await generator.generate(mockReport);

    expect(pack.content).toContain('Fix the login authentication bug');
    expect(pack.sections.some(s => s.category === 'task')).toBe(true);
  });

  it('includes architecture docs when enabled', async () => {
    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'claude',
      budget: 10000,
      includeArchitecture: true,
    });

    const pack = await generator.generate(mockReport);

    expect(pack.content).toContain('Architecture');
    expect(pack.sections.some(s => s.category === 'architecture')).toBe(true);
  });

  it('redacts secrets from content', async () => {
    // Add file with secret
    writeFileSync(join(TEST_DIR, 'src', 'auth', 'login.ts'), `
const API_KEY = "sk-1234567890abcdef1234567890abcdef";
export function login() { return API_KEY; }
`);

    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'claude',
      budget: 10000,
    });

    const pack = await generator.generate(mockReport);

    expect(pack.content).not.toContain('sk-1234567890');
    expect(pack.content).toContain('[REDACTED:');
  });

  it('produces deterministic output hash for same input', async () => {
    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'claude',
      budget: 10000,
    });

    const pack1 = await generator.generate(mockReport);
    const pack2 = await generator.generate(mockReport);

    // Content hash should be deterministic (ignoring timestamp)
    expect(pack1.manifest.contentHash).toBe(pack2.manifest.contentHash);
  });

  it('respects token budget', async () => {
    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'claude',
      budget: 500, // Very small budget
    });

    const pack = await generator.generate(mockReport);

    expect(pack.manifest.tokens.total).toBeLessThanOrEqual(500);
  });

  it('tracks file counts in manifest', async () => {
    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'claude',
      budget: 10000,
    });

    const pack = await generator.generate(mockReport);

    expect(pack.manifest.files.changed).toBe(1);
    expect(pack.manifest.files.impacted).toBe(1); // 2 total - 1 changed = 1 impacted
  });

  it('lists affected components in manifest', async () => {
    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'claude',
      budget: 10000,
    });

    const pack = await generator.generate(mockReport);

    expect(pack.manifest.components.affected).toBe(1);
    expect(pack.manifest.components.names).toContain('auth');
  });

  it('creates sections in correct order', async () => {
    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'claude',
      budget: 10000,
      taskDescription: 'Test task',
      includeArchitecture: true,
    });

    const pack = await generator.generate(mockReport);

    const categories = pack.sections.map(s => s.category);

    // Task should come before changed, changed before impacted
    const taskIdx = categories.indexOf('task');
    const changedIdx = categories.indexOf('changed');
    const impactedIdx = categories.indexOf('impacted');
    const archIdx = categories.indexOf('architecture');

    if (taskIdx >= 0 && changedIdx >= 0) {
      expect(taskIdx).toBeLessThan(changedIdx);
    }
    if (changedIdx >= 0 && impactedIdx >= 0) {
      expect(changedIdx).toBeLessThan(impactedIdx);
    }
    if (impactedIdx >= 0 && archIdx >= 0) {
      expect(impactedIdx).toBeLessThan(archIdx);
    }
  });

  it('handles missing files gracefully', async () => {
    const reportWithMissingFile: ImpactReport = {
      ...mockReport,
      changedFiles: [
        { path: 'src/nonexistent.ts', changeType: 'modified' },
      ],
    };

    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'claude',
      budget: 10000,
    });

    // Should not throw
    const pack = await generator.generate(reportWithMissingFile);
    expect(pack.manifest).toBeDefined();
  });

  it('uses correct language highlighting for file types', async () => {
    writeFileSync(join(TEST_DIR, 'src', 'style.css'), 'body { color: red; }');

    const reportWithCss: ImpactReport = {
      ...mockReport,
      changedFiles: [{ path: 'src/style.css', changeType: 'added' }],
      affectedFiles: ['src/style.css'],
    };

    const generator = new PromptPackGenerator({
      projectPath: TEST_DIR,
      provider: 'claude',
      budget: 10000,
    });

    const pack = await generator.generate(reportWithCss);

    expect(pack.content).toContain('```css');
  });
});

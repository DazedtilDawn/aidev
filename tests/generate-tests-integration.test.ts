import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const CLI_PATH = join(PROJECT_ROOT, 'src', 'cli.ts');
const FIXTURES_DIR = join(PROJECT_ROOT, 'tests', 'fixtures', 'generate-tests-integration');

function runCLI(command: string, cwd: string = FIXTURES_DIR): string {
  return execSync(`npx tsx "${CLI_PATH}" ${command}`, {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
}

describe('Generate Tests CLI Integration', () => {
  beforeAll(() => {
    rmSync(FIXTURES_DIR, { recursive: true, force: true });
    mkdirSync(FIXTURES_DIR, { recursive: true });

    mkdirSync(join(FIXTURES_DIR, 'src'), { recursive: true });

    writeFileSync(join(FIXTURES_DIR, 'src', 'math.ts'), `
export function add(a: number, b: number): number {
  return a + b;
}
`);
  });

  afterAll(() => {
    rmSync(FIXTURES_DIR, { recursive: true, force: true });
  });

  it('generates a specialized test prompt for a target file', () => {
    const output = runCLI('generate-tests src/math.ts --dry-run');
    
    expect(output).toContain('<context>');
    expect(output).toContain('Vitest Test Architect');
    expect(output).toContain('<skeleton path="src/math.ts"');
    expect(output).toContain('export function add(a: number, b: number): number {}');
    expect(output).not.toContain('return a + b');
  });
});

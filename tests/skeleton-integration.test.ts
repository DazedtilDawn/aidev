import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const CLI_PATH = join(PROJECT_ROOT, 'src', 'cli.ts');
const FIXTURES_DIR = join(PROJECT_ROOT, 'tests', 'fixtures', 'skeleton-integration');

function runCLI(command: string, cwd: string = FIXTURES_DIR): string {
  return execSync(`npx tsx "${CLI_PATH}" ${command}`, {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
}

describe('Skeleton CLI Integration', () => {
  beforeAll(() => {
    rmSync(FIXTURES_DIR, { recursive: true, force: true });
    mkdirSync(FIXTURES_DIR, { recursive: true });

    mkdirSync(join(FIXTURES_DIR, 'src'), { recursive: true });

    // main.ts imports utils.ts
    writeFileSync(join(FIXTURES_DIR, 'src', 'main.ts'), `
import { heavyLogic } from './utils.js';
export function run() {
  return heavyLogic();
}
`);
    // utils.ts has a large implementation
    writeFileSync(join(FIXTURES_DIR, 'src', 'utils.ts'), `
export function heavyLogic() {
  // This is a lot of code that we want to strip
  console.log("Step 1");
  console.log("Step 2");
  console.log("Step 3");
  console.log("Step 4");
  console.log("Step 5");
  return "result";
}
`);

    execSync('git init', { cwd: FIXTURES_DIR });
    execSync('git config user.email "test@test.com"', { cwd: FIXTURES_DIR });
    execSync('git config user.name "Test"', { cwd: FIXTURES_DIR });
    execSync('git add -A && git commit -m "initial"', { cwd: FIXTURES_DIR });

    // Initialize AIDEV and sync
    runCLI('init');
    runCLI('sync');
  });

  afterAll(() => {
    rmSync(FIXTURES_DIR, { recursive: true, force: true });
  });

  it('produces smaller token count with --skeleton flag', () => {
    // 1. Modify main.ts to trigger impact on utils.ts
    writeFileSync(join(FIXTURES_DIR, 'src', 'main.ts'), `
import { heavyLogic } from './utils.js';
export function run() {
  console.log('running');
  return heavyLogic();
}
`);
    // Do NOT commit, we'll use unstaged changes (default)

    // 2. Generate prompt without skeleton
    const outputFull = runCLI('prompt --provider universal --json');
    const manifestFull = JSON.parse(outputFull);
    const tokensFull = manifestFull.tokens.total;

    // 3. Generate prompt with skeleton
    const outputSkeleton = runCLI('prompt --provider universal --skeleton --json');
    const manifestSkeleton = JSON.parse(outputSkeleton);
    const tokensSkeleton = manifestSkeleton.tokens.total;

    console.log(`Tokens Full: ${tokensFull}, Tokens Skeleton: ${tokensSkeleton}`);
    
    expect(tokensSkeleton).toBeLessThan(tokensFull);

    // 4. Verify content of skeleton pack
    const outputSkeletonContent = runCLI('prompt --provider universal --skeleton');
    expect(outputSkeletonContent).toContain('<skeleton path="src/utils.ts"');
    expect(outputSkeletonContent).not.toContain('Step 1');
    expect(outputSkeletonContent).toContain('export function heavyLogic() {}');
  });
});

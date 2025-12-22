import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_REPO = 'C:\\dev\\AIDEV\\tests\\fixtures\\presets-integration-repo';

describe('CLI Presets Integration', () => {
  beforeEach(() => {
    if (existsSync(TEST_REPO)) {
      rmSync(TEST_REPO, { recursive: true, force: true });
    }
    mkdirSync(TEST_REPO, { recursive: true });
    
    // Initialize git repo
    execSync('git init', { cwd: TEST_REPO });
    execSync('git config user.email "test@example.com"', { cwd: TEST_REPO });
    execSync('git config user.name "Test User"', { cwd: TEST_REPO });

    // Create .aidev directory
    mkdirSync(join(TEST_REPO, '.aidev'), { recursive: true });
    writeFileSync(join(TEST_REPO, '.aidev', 'config.yaml'), `
version: '1.0.0'
scan:
  exclude: ['node_modules/']
providers:
  default: 'claude'
`);

    // Create a dummy file
    writeFileSync(join(TEST_REPO, 'index.ts'), 'console.log("hello");');
    execSync('git add .', { cwd: TEST_REPO });
    execSync('git commit -m "initial commit"', { cwd: TEST_REPO });
    
    // Modify the file to have staged changes
    writeFileSync(join(TEST_REPO, 'index.ts'), 'console.log("hello world");');
    execSync('git add index.ts', { cwd: TEST_REPO });
  });

  afterEach(() => {
    // Keep it for debugging if failed? No, follow cleanup.
    rmSync(TEST_REPO, { recursive: true, force: true });
  });

  it('runs aidev prompt with a preset', () => {
    // This will fail until the --preset flag is added
    try {
      const output = execSync('node C:\\dev\\AIDEV\\dist\\cli.js prompt --staged --preset bugfix', {
        cwd: TEST_REPO,
        encoding: 'utf-8',
      });
      
      expect(output).toContain('Senior Debugging Engineer');
      expect(output).toContain('<context>');
    } catch (error: any) {
      // Re-throw to fail the test
      throw new Error(`CLI Failed: ${error.stderr || error.message}`);
    }
  });
});

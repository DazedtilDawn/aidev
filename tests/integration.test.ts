import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const CLI_PATH = join(PROJECT_ROOT, 'src', 'cli.ts');
const FIXTURES_DIR = join(PROJECT_ROOT, 'tests', 'fixtures', 'integration-project');

function runCLI(command: string, cwd: string = FIXTURES_DIR): string {
  return execSync(`npx tsx "${CLI_PATH}" ${command}`, {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
}

describe('Integration Tests', () => {
  beforeAll(() => {
    // Create fixture project
    rmSync(FIXTURES_DIR, { recursive: true, force: true });
    mkdirSync(FIXTURES_DIR, { recursive: true });

    // Create a simple TypeScript project structure
    mkdirSync(join(FIXTURES_DIR, 'src', 'auth'), { recursive: true });
    mkdirSync(join(FIXTURES_DIR, 'src', 'api'), { recursive: true });
    mkdirSync(join(FIXTURES_DIR, 'src', 'db'), { recursive: true });

    // Create source files with imports
    writeFileSync(
      join(FIXTURES_DIR, 'src', 'auth', 'login.ts'),
      `import { validateUser } from './validator.js';
import { createSession } from '../api/session.js';

export function login(username: string, password: string) {
  if (validateUser(username, password)) {
    return createSession(username);
  }
  return null;
}
`
    );

    writeFileSync(
      join(FIXTURES_DIR, 'src', 'auth', 'validator.ts'),
      `import { db } from '../db/connection.js';

export function validateUser(username: string, password: string): boolean {
  const user = db.findUser(username);
  return user?.password === password;
}
`
    );

    writeFileSync(
      join(FIXTURES_DIR, 'src', 'api', 'session.ts'),
      `export function createSession(username: string): string {
  return \`session-\${username}-\${Date.now()}\`;
}
`
    );

    writeFileSync(
      join(FIXTURES_DIR, 'src', 'db', 'connection.ts'),
      `export const db = {
  findUser: (username: string) => {
    // Mock database lookup
    if (username === 'admin') {
      return { username: 'admin', password: 'secret' };
    }
    return null;
  }
};
`
    );

    writeFileSync(
      join(FIXTURES_DIR, 'src', 'index.ts'),
      `import { login } from './auth/login.js';

export { login };
`
    );

    // Initialize git repo
    execSync('git init', { cwd: FIXTURES_DIR });
    execSync('git config user.email "test@test.com"', { cwd: FIXTURES_DIR });
    execSync('git config user.name "Test"', { cwd: FIXTURES_DIR });
    execSync('git add -A && git commit -m "initial"', { cwd: FIXTURES_DIR });
  });

  afterAll(() => {
    rmSync(FIXTURES_DIR, { recursive: true, force: true });
  });

  describe('Full Workflow', () => {
    it('init -> sync -> impact -> prompt', { timeout: 30000 }, () => {
      // Step 1: Initialize AIDEV
      const initOutput = runCLI('init');
      expect(initOutput).toContain('initialized successfully');
      expect(existsSync(join(FIXTURES_DIR, '.aidev'))).toBe(true);

      // Step 2: Sync to discover dependencies
      const syncOutput = runCLI('sync');
      expect(syncOutput).toContain('Edges discovered');
      expect(syncOutput).toContain('Files scanned');

      // Check discovered edges file
      const edgesPath = join(FIXTURES_DIR, '.aidev', 'model', 'graph', 'discovered_edges.yaml');
      expect(existsSync(edgesPath)).toBe(true);
      const edgesContent = yaml.load(readFileSync(edgesPath, 'utf-8')) as { edges: unknown[] };
      expect(edgesContent.edges.length).toBeGreaterThan(0);

      // Step 3: Make a change and commit
      writeFileSync(
        join(FIXTURES_DIR, 'src', 'auth', 'login.ts'),
        `import { validateUser } from './validator.js';
import { createSession } from '../api/session.js';

export function login(username: string, password: string) {
  console.log('Login attempt:', username);
  if (validateUser(username, password)) {
    return createSession(username);
  }
  return null;
}
`
      );
      execSync('git add -A && git commit -m "add logging"', { cwd: FIXTURES_DIR });

      // Step 4: Analyze impact
      const impactOutput = runCLI('impact --diff HEAD~1..HEAD');
      expect(impactOutput).toContain('login.ts');
    });
  });

  describe('aidev sync', () => {
    it('discovers file dependencies correctly', () => {
      const output = runCLI('sync --verbose');

      // Should find TypeScript files
      expect(output).toContain('Scanned: src/auth/login.ts');
      expect(output).toContain('Scanned: src/auth/validator.ts');
      expect(output).toContain('Scanned: src/db/connection.ts');

      // Should discover edges
      expect(output).toContain('Edges discovered');
    });

    it('check mode reports drift without modifying', { timeout: 30000 }, () => {
      // First sync to baseline
      runCLI('sync --fix');

      // Modify the edges file manually
      const edgesPath = join(FIXTURES_DIR, '.aidev', 'model', 'graph', 'discovered_edges.yaml');
      writeFileSync(edgesPath, yaml.dump({ edges: [] }));

      // Check should report drift
      try {
        runCLI('sync --check');
        expect.fail('Should have exited with error');
      } catch (error: unknown) {
        const execError = error as { status: number; stdout: string };
        expect(execError.status).toBe(1);
      }

      // Fix mode should update
      const fixOutput = runCLI('sync --fix');
      expect(fixOutput).toContain('Updated');
    });
  });

  describe('aidev impact', () => {
    it('analyzes specific file', () => {
      const output = runCLI('impact --file src/auth/login.ts');
      expect(output).toContain('login.ts');
    });

    it('outputs JSON format', () => {
      const output = runCLI('impact --file src/auth/login.ts --json');
      const json = JSON.parse(output);
      expect(json).toHaveProperty('changedFiles');
      expect(json).toHaveProperty('summary');
    });
  });

  describe('aidev prompt', () => {
    it('generates prompt pack for staged changes', () => {
      // Make a change and stage it
      writeFileSync(
        join(FIXTURES_DIR, 'src', 'db', 'connection.ts'),
        `// Database connection module
export const db = {
  findUser: (username: string) => {
    console.log('Looking up user:', username);
    if (username === 'admin') {
      return { username: 'admin', password: 'secret' };
    }
    return null;
  }
};
`
      );
      execSync('git add src/db/connection.ts', { cwd: FIXTURES_DIR });

      const output = runCLI('prompt --staged');
      expect(output).toContain('Prompt Pack Summary');
      expect(output).toContain('connection.ts');
    });

    it('outputs JSON manifest', () => {
      const output = runCLI('prompt --staged --json');
      const json = JSON.parse(output);
      expect(json).toHaveProperty('version');
      expect(json).toHaveProperty('tokens');
    });

    it('writes to output file', () => {
      const outputPath = join(FIXTURES_DIR, 'prompt-pack.xml');
      runCLI(`prompt --staged --output "${outputPath}"`);
      expect(existsSync(outputPath)).toBe(true);
      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('<context>');
    });
  });
});

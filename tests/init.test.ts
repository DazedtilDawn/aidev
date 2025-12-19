import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const TEST_DIR = join(PROJECT_ROOT, 'tests', 'fixtures', 'init-test');
const CLI_PATH = join(PROJECT_ROOT, 'src', 'cli.ts');

describe('Init Command', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('creates .aidev directory structure', () => {
    execSync(`npx tsx "${CLI_PATH}" init`, { cwd: TEST_DIR });

    expect(existsSync(join(TEST_DIR, '.aidev'))).toBe(true);
    expect(existsSync(join(TEST_DIR, '.aidev', 'config.yaml'))).toBe(true);
    expect(existsSync(join(TEST_DIR, '.aidev', 'model', 'components'))).toBe(true);
    expect(existsSync(join(TEST_DIR, '.aidev', 'model', 'graph'))).toBe(true);
    expect(existsSync(join(TEST_DIR, '.aidev', 'cache'))).toBe(true);
  });

  it('creates valid config.yaml', () => {
    execSync(`npx tsx "${CLI_PATH}" init`, { cwd: TEST_DIR });

    const configPath = join(TEST_DIR, '.aidev', 'config.yaml');
    const content = readFileSync(configPath, 'utf-8');
    const config = yaml.load(content) as Record<string, unknown>;

    expect(config.version).toBe('1.0.0');
    expect(config.scan).toBeDefined();
    expect(config.providers).toBeDefined();
  });

  it('creates example component file', () => {
    execSync(`npx tsx "${CLI_PATH}" init`, { cwd: TEST_DIR });

    const examplePath = join(TEST_DIR, '.aidev', 'model', 'components', '_example.yaml');
    expect(existsSync(examplePath)).toBe(true);

    const content = readFileSync(examplePath, 'utf-8');
    const component = yaml.load(content) as Record<string, unknown>;

    expect(component.name).toBe('example-component');
    expect(component.paths).toBeDefined();
  });

  it('creates edge files', () => {
    execSync(`npx tsx "${CLI_PATH}" init`, { cwd: TEST_DIR });

    const declaredPath = join(TEST_DIR, '.aidev', 'model', 'graph', 'declared_edges.yaml');
    const discoveredPath = join(TEST_DIR, '.aidev', 'model', 'graph', 'discovered_edges.yaml');

    expect(existsSync(declaredPath)).toBe(true);
    expect(existsSync(discoveredPath)).toBe(true);
  });

  it('fails if .aidev exists without --force', () => {
    execSync(`npx tsx "${CLI_PATH}" init`, { cwd: TEST_DIR });

    expect(() => {
      execSync(`npx tsx "${CLI_PATH}" init`, { cwd: TEST_DIR, stdio: 'pipe' });
    }).toThrow();
  });

  it('overwrites with --force', () => {
    execSync(`npx tsx "${CLI_PATH}" init`, { cwd: TEST_DIR });

    // Should not throw
    execSync(`npx tsx "${CLI_PATH}" init --force`, { cwd: TEST_DIR });

    expect(existsSync(join(TEST_DIR, '.aidev'))).toBe(true);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { GitService } from '../src/git/service.js';

const TEST_DIR = 'C:\\dev\\AIDEV\\tests\\fixtures\\git-test';

describe('GitService', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    execSync('git init', { cwd: TEST_DIR });
    execSync('git config user.email "test@test.com"', { cwd: TEST_DIR });
    execSync('git config user.name "Test"', { cwd: TEST_DIR });
    writeFileSync(`${TEST_DIR}/initial.txt`, 'initial');
    execSync('git add -A && git commit -m "initial"', { cwd: TEST_DIR });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('gets changed files for staged changes', async () => {
    writeFileSync(`${TEST_DIR}/new.txt`, 'new content');
    execSync('git add new.txt', { cwd: TEST_DIR });

    const service = new GitService(TEST_DIR);
    const changes = await service.getStagedChanges();

    expect(changes).toHaveLength(1);
    expect(changes[0].path).toBe('new.txt');
    expect(changes[0].changeType).toBe('added');
  });

  it('gets changed files between refs', async () => {
    writeFileSync(`${TEST_DIR}/modified.txt`, 'modified');
    execSync('git add -A && git commit -m "second"', { cwd: TEST_DIR });

    const service = new GitService(TEST_DIR);
    const changes = await service.getDiffChanges('HEAD~1', 'HEAD');

    expect(changes).toHaveLength(1);
    expect(changes[0].path).toBe('modified.txt');
  });

  it('gets current branch', async () => {
    const service = new GitService(TEST_DIR);
    const branch = await service.getCurrentBranch();

    // Git init creates master or main depending on config
    expect(['master', 'main']).toContain(branch);
  });

  it('gets file content', async () => {
    const service = new GitService(TEST_DIR);
    const content = await service.getFileContent('initial.txt');

    expect(content).toBe('initial');
  });
});

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('CLI', () => {
  it('shows help with --help flag', () => {
    const output = execSync('npx tsx src/cli.ts --help', { encoding: 'utf-8' });
    expect(output).toContain('aidev');
    expect(output).toContain('impact');
    expect(output).toContain('prompt');
  });
});

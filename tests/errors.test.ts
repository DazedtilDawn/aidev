import { describe, it, expect } from 'vitest';
import {
  AidevError, ConfigError, GitError, ParseError, ScanError,
  exitCodeFor, formatError
} from '../src/errors/index.js';

describe('Error Classes', () => {
  it('ConfigError has correct exit code', () => {
    const err = new ConfigError('Invalid YAML');
    expect(exitCodeFor(err)).toBe(10);
  });

  it('GitError has correct exit code', () => {
    const err = new GitError('Not a git repository');
    expect(exitCodeFor(err)).toBe(20);
  });

  it('ParseError has correct exit code', () => {
    const err = new ParseError('Invalid component schema', 'auth.yaml');
    expect(exitCodeFor(err)).toBe(30);
  });

  it('ScanError has correct exit code', () => {
    const err = new ScanError('Failed to scan file', 'broken.ts');
    expect(exitCodeFor(err)).toBe(40);
  });

  it('formats errors for JSON output', () => {
    const err = new ConfigError('Bad config');
    const formatted = formatError(err, 'json');
    expect(JSON.parse(formatted)).toMatchObject({
      error: 'ConfigError',
      message: 'Bad config',
      exitCode: 10,
    });
  });

  it('formats errors for text output', () => {
    const err = new GitError('Not a git repo');
    const formatted = formatError(err, 'text');
    expect(formatted).toBe('Error [GitError]: Not a git repo');
  });
});

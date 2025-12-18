import { describe, it, expect } from 'vitest';
import { parseDiffOutput, ChangedFile } from '../src/git/diff-parser.js';

describe('Git Diff Parser', () => {
  it('parses added file', () => {
    const diffOutput = `A\tsrc/new-file.ts`;
    const result = parseDiffOutput(diffOutput);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: 'src/new-file.ts',
      changeType: 'added',
      oldPath: undefined,
    });
  });

  it('parses modified file', () => {
    const diffOutput = `M\tsrc/existing.ts`;
    const result = parseDiffOutput(diffOutput);
    expect(result[0].changeType).toBe('modified');
  });

  it('parses renamed file', () => {
    const diffOutput = `R100\tsrc/old.ts\tsrc/new.ts`;
    const result = parseDiffOutput(diffOutput);
    expect(result[0]).toEqual({
      path: 'src/new.ts',
      changeType: 'renamed',
      oldPath: 'src/old.ts',
    });
  });

  it('parses deleted file', () => {
    const diffOutput = `D\tsrc/removed.ts`;
    const result = parseDiffOutput(diffOutput);
    expect(result[0].changeType).toBe('deleted');
  });

  it('parses multiple files', () => {
    const diffOutput = `A\tsrc/new.ts
M\tsrc/modified.ts
D\tsrc/deleted.ts`;
    const result = parseDiffOutput(diffOutput);
    expect(result).toHaveLength(3);
    expect(result[0].changeType).toBe('added');
    expect(result[1].changeType).toBe('modified');
    expect(result[2].changeType).toBe('deleted');
  });

  it('handles empty output', () => {
    const result = parseDiffOutput('');
    expect(result).toHaveLength(0);
  });
});

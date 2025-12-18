import { describe, it, expect } from 'vitest';
import { normalizePath, stableSortBy, canonicalizeOutput } from '../src/utils/index.js';

describe('Path Normalization', () => {
  it('converts Windows paths to POSIX', () => {
    expect(normalizePath('src\\auth\\login.ts')).toBe('src/auth/login.ts');
    expect(normalizePath('C:\\dev\\project\\file.ts')).toBe('C:/dev/project/file.ts');
  });

  it('handles already-POSIX paths', () => {
    expect(normalizePath('src/auth/login.ts')).toBe('src/auth/login.ts');
  });

  it('normalizes trailing slashes consistently', () => {
    expect(normalizePath('src/auth/')).toBe('src/auth');
    expect(normalizePath('src/auth')).toBe('src/auth');
  });
});

describe('Stable Sorting', () => {
  it('sorts by key with stable tie-breaking', () => {
    const items = [
      { name: 'b', priority: 1 },
      { name: 'a', priority: 1 },
      { name: 'c', priority: 2 },
    ];
    const sorted = stableSortBy(items, x => -x.priority, x => x.name);
    expect(sorted.map(x => x.name)).toEqual(['c', 'a', 'b']);
  });
});

describe('Output Canonicalization', () => {
  it('produces identical JSON for same data regardless of insertion order', () => {
    const obj1 = { b: 1, a: 2, c: 3 };
    const obj2 = { a: 2, c: 3, b: 1 };
    expect(canonicalizeOutput(obj1)).toBe(canonicalizeOutput(obj2));
  });
});

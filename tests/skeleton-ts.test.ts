import { describe, it, expect } from 'vitest';
import { TypeScriptSkeletonExtractor } from '../src/scanners/skeletons/typescript.js';

describe('TypeScript Skeleton Extractor', () => {
  const extractor = new TypeScriptSkeletonExtractor();

  it('removes function declaration bodies', () => {
    const code = `
export function add(a: number, b: number): number {
  console.log("calculating");
  return a + b;
}
    `;
    const skeleton = extractor.extractSkeleton(code);
    expect(skeleton).toContain('export function add(a: number, b: number): number {}');
    expect(skeleton).not.toContain('console.log');
    expect(skeleton).not.toContain('return a + b');
  });

  it('removes arrow function block bodies', () => {
    const code = `
export const multiply = (a: number, b: number) => {
  return a * b;
};
    `;
    const skeleton = extractor.extractSkeleton(code);
    expect(skeleton).toContain('export const multiply = (a: number, b: number) => {}');
    expect(skeleton).not.toContain('return a * b');
  });

  it('preserves arrow function expression bodies (implicit return)', () => {
    const code = 'export const square = (x: number) => x * x;';
    const skeleton = extractor.extractSkeleton(code);
    expect(skeleton).toBe(code);
  });

  it('removes class method bodies', () => {
    const code = `
export class Calculator {
  constructor(private base: number) {
    this.base = base;
  }

  add(n: number): number {
    return this.base + n;
  }
}
    `;
    const skeleton = extractor.extractSkeleton(code);
    expect(skeleton).toContain('constructor(private base: number) {}');
    expect(skeleton).toContain('add(n: number): number {}');
    expect(skeleton).not.toContain('this.base = base');
  });

  it('preserves interfaces and types', () => {
    const code = `
export interface User {
  id: string;
  name: string;
}
export type ID = string;
    `;
    const skeleton = extractor.extractSkeleton(code);
    expect(skeleton.trim()).toBe(code.trim());
  });

  it('handles nested functions (removes parent body only)', () => {
    const code = `
function outer() {
  function inner() {
    return 1;
  }
  return inner();
}
    `;
    const skeleton = extractor.extractSkeleton(code);
    expect(skeleton).toContain('function outer() {}');
    expect(skeleton).not.toContain('function inner');
  });

  it('handles heavy comments and formatting', () => {
    const code = `
/**
 * A complex function
 */
export function complex(
  a: string, // param a
  b: number  // param b
): void {
  // This is the body
  const x = 1;
}
    `;
    const skeleton = extractor.extractSkeleton(code);
    // Use backticks for expect strings that might have newlines or be complex
    expect(skeleton).toContain(`/**
 * A complex function
 */`);
    expect(skeleton).toContain('export function complex(');
    expect(skeleton).toContain('  a: string, // param a');
    expect(skeleton).toContain('): void {}');
    expect(skeleton).not.toContain('// This is the body');
  });
});

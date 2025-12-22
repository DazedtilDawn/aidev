import { describe, it, expect } from 'vitest';
import { TestGenerator } from '../src/prompt/test-generator.js';

describe('TestGenerator', () => {
  const generator = new TestGenerator();

  it('generates a test prompt with skeleton and preset', async () => {
    const code = `
export function add(a: number, b: number): number {
  return a + b;
}
    `;
    const filePath = 'src/math.ts';
    const prompt = await generator.generateTestPrompt(filePath, code);

    expect(prompt).toContain('<context>');
    expect(prompt).toContain('<instructions>');
    expect(prompt).toContain('Vitest Test Architect');
    expect(prompt).toContain('<skeleton path="src/math.ts"');
    expect(prompt).toContain('export function add(a: number, b: number): number {}');
    expect(prompt).not.toContain('return a + b');
  });
});

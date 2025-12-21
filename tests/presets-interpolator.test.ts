import { describe, it, expect } from 'vitest';
import { interpolate } from '../src/prompt/presets/interpolator.js';

describe('interpolate', () => {
  it('replaces variables in the template', () => {
    const template = 'Hello, {{name}}!';
    const variables = { name: 'World' };
    const result = interpolate(template, variables);
    expect(result).toBe('Hello, World!');
  });

  it('handles multiple variables', () => {
    const template = '{{greeting}}, {{name}}!';
    const variables = { greeting: 'Hi', name: 'User' };
    const result = interpolate(template, variables);
    expect(result).toBe('Hi, User!');
  });

  it('throws error for missing variables', () => {
    const template = 'Hello, {{name}}!';
    const variables = {};
    expect(() => interpolate(template, variables)).toThrow(/Missing variable: name/);
  });

  it('ignores whitespace in variable names', () => {
    const template = 'Hello, {{ name }}!';
    const variables = { name: 'World' };
    const result = interpolate(template, variables);
    expect(result).toBe('Hello, World!');
  });
});

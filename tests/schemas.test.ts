import { describe, it, expect } from 'vitest';
import { ComponentSchema, parseComponent } from '../src/schemas/component.js';
import { EdgeSchema, parseEdge } from '../src/schemas/edge.js';

describe('Schemas', () => {
  it('validates a valid component', () => {
    const valid = {
      name: 'auth-service',
      description: 'Authentication service',
      paths: ['src/auth/**'],
      depends_on: ['database']
    };
    expect(() => parseComponent(valid)).not.toThrow();
  });

  it('rejects component without name', () => {
    const invalid = { paths: ['src/**'] };
    expect(() => parseComponent(invalid)).toThrow();
  });

  it('validates edge with confidence bounds', () => {
    const valid = {
      source: 'a.ts',
      target: 'b.ts',
      type: 'import',
      confidence: 0.95
    };
    expect(() => parseEdge(valid)).not.toThrow();
  });

  it('rejects edge with confidence > 1', () => {
    const invalid = {
      source: 'a.ts',
      target: 'b.ts',
      type: 'import',
      confidence: 1.5
    };
    expect(() => parseEdge(invalid)).toThrow();
  });
});

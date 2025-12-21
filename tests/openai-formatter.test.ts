import { describe, it, expect } from 'vitest';
import { OpenAIFormatter } from '../src/prompt/formatters/openai';
import { ContextBundle } from '../src/prompt/types';

describe('OpenAIFormatter', () => {
  const mockBundle: ContextBundle = {
    timestamp: '2025-12-21T00:00:00Z',
    impactReport: {
      changedFiles: [],
      affectedComponents: ['auth'],
      affectedFiles: ['src/auth/login.ts'],
      impactEdges: [],
      fileImpactEdges: [],
      summary: {
        filesChanged: 0,
        componentsAffected: 1,
        filesAffected: 1,
        confidenceMean: 1.0,
      },
    },
    files: [
      {
        path: 'src/auth/login.ts',
        content: 'export function login() {}',
        isRedacted: false,
      },
    ],
    instructions: 'Please fix the login bug.',
  };

  it('should format as an array of messages for OpenAI', () => {
    const formatter = new OpenAIFormatter();
    const result = formatter.format(mockBundle) as any;

    expect(Array.isArray(result)).toBe(true);
    expect(result[0].role).toBe('system');
    expect(result[0].content).toContain('AI Development Context Pack');
    
    expect(result[1].role).toBe('user');
    expect(result[1].content).toContain('Please fix the login bug.');
    expect(result[1].content).toContain('src/auth/login.ts');
    expect(result[1].content).toContain('export function login() {}');
  });

  it('should include metadata in the system message', () => {
    const formatter = new OpenAIFormatter();
    const result = formatter.format(mockBundle) as any;

    expect(result[0].content).toContain('2025-12-21T00:00:00Z');
    expect(result[0].content).toContain('Affected Components: auth');
  });
});

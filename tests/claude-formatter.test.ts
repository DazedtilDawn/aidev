import { describe, it, expect } from 'vitest';
import { ClaudeFormatter } from '../src/prompt/formatters/claude';
import { ContextBundle } from '../src/prompt/types';

describe('ClaudeFormatter', () => {
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

  it('should format as valid XML for Claude', () => {
    const formatter = new ClaudeFormatter();
    const result = formatter.format(mockBundle) as string;

    expect(result).toContain('<context>');
    expect(result).toContain('<instructions>');
    expect(result).toContain('Please fix the login bug.');
    expect(result).toContain('<files>');
    expect(result).toContain('<file path="src/auth/login.ts">');
    expect(result).toContain('export function login() {}');
    expect(result).toContain('</file>');
    expect(result).toContain('<impact_summary>');
    expect(result).toContain('auth');
    expect(result).toContain('</context>');
  });

  it('should escape special characters in content', () => {
    const bundleWithSpecialChars: ContextBundle = {
      ...mockBundle,
      files: [
        {
          path: 'test.ts',
          content: 'if (a < b && c > d) {}',
          isRedacted: false,
        },
      ],
    };
    const formatter = new ClaudeFormatter();
    const result = formatter.format(bundleWithSpecialChars) as string;

    expect(result).toContain('if (a &lt; b &amp;&amp; c &gt; d) {}');
  });
});

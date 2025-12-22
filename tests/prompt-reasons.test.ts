import { describe, it, expect } from 'vitest';
import { ClaudeFormatter } from '../src/prompt/formatters/claude.js';
import { OpenAIFormatter } from '../src/prompt/formatters/openai.js';
import { ContextBundle } from '../src/prompt/types.js';

const mockBundle: ContextBundle = {
  timestamp: '2025-01-01',
  impactReport: {
    changedFiles: [],
    affectedComponents: [],
    affectedFiles: [],
    impactEdges: [],
    fileImpactEdges: [],
    summary: { filesChanged: 0, componentsAffected: 0, filesAffected: 0, confidenceMean: 0 }
  },
  files: [
    {
      path: 'src/foo.ts',
      content: 'foo',
      reason: 'Changed file'
    },
    {
      path: 'src/bar.ts',
      content: 'bar',
      reason: 'Imported by src/foo.ts'
    }
  ],
  instructions: 'Test',
  tokenEstimate: 100
};

describe('Context Rationale', () => {
  it('ClaudeFormatter includes reason attribute', () => {
    const formatter = new ClaudeFormatter();
    const result = formatter.format(mockBundle);
    
    expect(result).toContain('<file path="src/foo.ts" reason="Changed file">');
    expect(result).toContain('<file path="src/bar.ts" reason="Imported by src/foo.ts">');
  });

  it('OpenAIFormatter includes reason in context block', () => {
    const formatter = new OpenAIFormatter();
    const result = formatter.format(mockBundle) as any;
    const userMessage = result[1].content;

    expect(userMessage).toContain('### File: src/foo.ts');
    expect(userMessage).toContain('> Context: Changed file');
    
    expect(userMessage).toContain('### File: src/bar.ts');
    expect(userMessage).toContain('> Context: Imported by src/foo.ts');
  });
});

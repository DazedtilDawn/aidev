import { describe, it, expect } from 'vitest';
import { ClaudeAdapter } from '../src/providers/claude.js';
import { OpenAIAdapter } from '../src/providers/openai.js';
import { createAdapter } from '../src/providers/index.js';
import { PromptPack, PromptSection, ContextCategory, AllocationResult } from '../src/prompt/index.js';

describe('Provider Adapters', () => {
  // Create a mock prompt pack for testing
  const mockSection: PromptSection = {
    category: 'changed' as ContextCategory,
    title: 'Changed Files',
    content: '## File: src/auth/login.ts\n```typescript\nexport function login() {}\n```',
    tokens: 50,
    files: ['src/auth/login.ts'],
  };

  const mockAllocation: AllocationResult = {
    allocated: [],
    dropped: [],
    totalTokens: 100,
    budgetUsed: {
      task: 0,
      changed: 50,
      impacted: 50,
      contract: 0,
      architecture: 0,
      decision: 0,
    },
  };

  const mockPack: PromptPack = {
    manifest: {
      version: '1.0.0',
      provider: 'claude',
      generatedAt: '2024-01-01T00:00:00.000Z',
      contentHash: 'abc123',
      tokens: {
        total: 100,
        byCategory: mockAllocation.budgetUsed,
        budget: 10000,
        utilization: 0.01,
      },
      files: {
        changed: 1,
        impacted: 2,
        included: 3,
        redacted: 0,
      },
      components: {
        affected: 1,
        names: ['auth'],
      },
    },
    content: 'Raw content',
    sections: [
      {
        category: 'task' as ContextCategory,
        title: 'Task Description',
        content: 'Fix the login bug',
        tokens: 10,
        files: [],
      },
      mockSection,
    ],
    allocation: mockAllocation,
  };

  describe('ClaudeAdapter', () => {
    const adapter = new ClaudeAdapter();

    it('has correct name', () => {
      expect(adapter.name).toBe('claude');
    });

    it('formats output as XML', () => {
      const output = adapter.format(mockPack);

      expect(output.mimeType).toBe('text/xml');
      expect(output.extension).toBe('.xml');
      expect(output.provider).toBe('claude');
    });

    it('includes context wrapper tags', () => {
      const output = adapter.format(mockPack);

      expect(output.content).toContain('<context>');
      expect(output.content).toContain('</context>');
    });

    it('includes metadata section', () => {
      const output = adapter.format(mockPack);

      expect(output.content).toContain('<metadata>');
      expect(output.content).toContain('<provider>claude</provider>');
      expect(output.content).toContain('<content_hash>abc123</content_hash>');
      expect(output.content).toContain('</metadata>');
    });

    it('includes affected components', () => {
      const output = adapter.format(mockPack);

      expect(output.content).toContain('<affected_components>');
      expect(output.content).toContain('<component>auth</component>');
      expect(output.content).toContain('</affected_components>');
    });

    it('formats sections with appropriate tags', () => {
      const output = adapter.format(mockPack);

      expect(output.content).toContain('<task_description>');
      expect(output.content).toContain('<changed_files>');
    });

    it('escapes XML special characters', () => {
      const sectionWithSpecialChars: PromptSection = {
        category: 'task' as ContextCategory,
        title: 'Test <special> & "chars"',
        content: 'Code with <generics> & operators && "strings"',
        tokens: 10,
        files: [],
      };

      const formatted = adapter.formatSection(sectionWithSpecialChars);

      expect(formatted).toContain('&lt;special&gt;');
      expect(formatted).toContain('&amp;');
      expect(formatted).toContain('&quot;chars&quot;');
    });

    it('includes file list in sections', () => {
      const output = adapter.format(mockPack);

      expect(output.content).toContain('<files>');
      expect(output.content).toContain('<file>src/auth/login.ts</file>');
    });
  });

  describe('OpenAIAdapter', () => {
    const adapter = new OpenAIAdapter();

    it('has correct name', () => {
      expect(adapter.name).toBe('openai');
    });

    it('formats output as JSON', () => {
      const output = adapter.format(mockPack);

      expect(output.mimeType).toBe('application/json');
      expect(output.extension).toBe('.json');
      expect(output.provider).toBe('openai');
    });

    it('produces valid JSON', () => {
      const output = adapter.format(mockPack);

      expect(() => JSON.parse(output.content)).not.toThrow();
    });

    it('creates messages array', () => {
      const messages = adapter.toMessages(mockPack);

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThanOrEqual(2);
    });

    it('includes system message', () => {
      const messages = adapter.toMessages(mockPack);
      const systemMsg = messages.find(m => m.role === 'system');

      expect(systemMsg).toBeDefined();
      expect(systemMsg?.content).toContain('expert software developer');
    });

    it('includes user message with context', () => {
      const messages = adapter.toMessages(mockPack);
      const userMsg = messages.find(m => m.role === 'user');

      expect(userMsg).toBeDefined();
      expect(userMsg?.content).toContain('Task');
      expect(userMsg?.content).toContain('Changed Files');
    });

    it('includes component information in system message', () => {
      const messages = adapter.toMessages(mockPack);
      const systemMsg = messages.find(m => m.role === 'system');

      expect(systemMsg?.content).toContain('auth');
    });

    it('formats sections with markdown headers', () => {
      const formatted = adapter.formatSection(mockSection);

      expect(formatted).toContain('## Changed Files');
      expect(formatted).toContain('Files: src/auth/login.ts');
    });
  });

  describe('createAdapter', () => {
    it('creates Claude adapter for "claude"', () => {
      const adapter = createAdapter('claude');
      expect(adapter.name).toBe('claude');
    });

    it('creates Claude adapter for "anthropic"', () => {
      const adapter = createAdapter('anthropic');
      expect(adapter.name).toBe('claude');
    });

    it('creates OpenAI adapter for "openai"', () => {
      const adapter = createAdapter('openai');
      expect(adapter.name).toBe('openai');
    });

    it('creates OpenAI adapter for "gpt"', () => {
      const adapter = createAdapter('gpt');
      expect(adapter.name).toBe('openai');
    });

    it('defaults to Claude for unknown providers', () => {
      const adapter = createAdapter('unknown');
      expect(adapter.name).toBe('claude');
    });

    it('is case-insensitive', () => {
      expect(createAdapter('CLAUDE').name).toBe('claude');
      expect(createAdapter('OpenAI').name).toBe('openai');
    });
  });

  describe('Output determinism', () => {
    it('Claude adapter produces consistent output', () => {
      const adapter = new ClaudeAdapter();
      const output1 = adapter.format(mockPack);
      const output2 = adapter.format(mockPack);

      expect(output1.content).toBe(output2.content);
    });

    it('OpenAI adapter produces consistent output', () => {
      const adapter = new OpenAIAdapter();
      const output1 = adapter.format(mockPack);
      const output2 = adapter.format(mockPack);

      expect(output1.content).toBe(output2.content);
    });
  });
});

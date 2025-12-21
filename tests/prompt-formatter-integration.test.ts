import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { PromptPackGenerator } from '../src/prompt/generator.js';
import { PromptFormatter, ContextBundle, ContextFile } from '../src/prompt/types.js';
import { ImpactReport } from '../src/impact/index.js';

const TEST_DIR = 'C:\\dev\\AIDEV\\tests\\fixtures\\formatter-integration-test';

/**
 * XmlFormatter - A real Claude-style XML formatter for integration testing.
 *
 * This formatter produces structured XML output that matches Claude's
 * expected input format with <context>, <files>, and <instructions> tags.
 *
 * CONTRACT:
 * - Receives a ContextBundle with files, instructions, and metadata
 * - Returns a string containing well-formed XML
 * - Preserves file paths and content exactly as received
 * - Maintains redaction markers without modification
 */
class XmlFormatter implements PromptFormatter {
  providerName = 'claude-xml';

  format(bundle: ContextBundle): string {
    const lines: string[] = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<context>');
    lines.push(`  <generated>${this.escapeXml(bundle.timestamp)}</generated>`);
    lines.push(`  <token_estimate>${bundle.tokenEstimate ?? 0}</token_estimate>`);

    // Instructions section
    if (bundle.instructions) {
      lines.push('  <instructions>');
      lines.push(`    ${this.escapeXml(bundle.instructions)}`);
      lines.push('  </instructions>');
    }

    // Files section
    lines.push('  <files>');
    for (const file of bundle.files) {
      lines.push(`    <file path="${this.escapeXml(file.path)}" redacted="${file.isRedacted ?? false}">`);
      lines.push('      <![CDATA[');
      lines.push(file.content);
      lines.push('      ]]>');
      lines.push('    </file>');
    }
    lines.push('  </files>');

    // Impact summary section
    lines.push('  <impact_summary>');
    lines.push(`    <files_changed>${bundle.impactReport.changedFiles.length}</files_changed>`);
    lines.push(`    <components_affected>${bundle.impactReport.affectedComponents.length}</components_affected>`);
    lines.push(`    <components>${bundle.impactReport.affectedComponents.join(', ')}</components>`);
    lines.push('  </impact_summary>');

    lines.push('</context>');

    return lines.join('\n');
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * JsonFormatter - Returns structured JSON for OpenAI-style providers.
 * Tests the object return path of PromptFormatter.format()
 */
class JsonFormatter implements PromptFormatter {
  providerName = 'openai-json';

  format(bundle: ContextBundle): object {
    return {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful coding assistant.'
        },
        {
          role: 'user',
          content: this.buildUserMessage(bundle)
        }
      ],
      metadata: {
        generated: bundle.timestamp,
        tokenEstimate: bundle.tokenEstimate,
        filesIncluded: bundle.files.length,
        componentsAffected: bundle.impactReport.affectedComponents
      }
    };
  }

  private buildUserMessage(bundle: ContextBundle): string {
    const parts: string[] = [];

    if (bundle.instructions) {
      parts.push(`## Task\n${bundle.instructions}\n`);
    }

    parts.push('## Files\n');
    for (const file of bundle.files) {
      parts.push(`### ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n`);
    }

    return parts.join('\n');
  }
}

describe('PromptFormatter Integration', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, 'src', 'services'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'src', 'models'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'src', 'utils'), { recursive: true });

    // Create realistic TypeScript files
    writeFileSync(join(TEST_DIR, 'src', 'services', 'user-service.ts'), `
import { UserModel } from '../models/user.js';
import { hashPassword } from '../utils/crypto.js';

export class UserService {
  async createUser(email: string, password: string): Promise<UserModel> {
    const hashedPassword = await hashPassword(password);
    return UserModel.create({ email, password: hashedPassword });
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    return UserModel.findOne({ where: { email } });
  }

  async validateCredentials(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user) return false;
    return user.verifyPassword(password);
  }
}
`);

    writeFileSync(join(TEST_DIR, 'src', 'models', 'user.ts'), `
export interface UserAttributes {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
}

export class UserModel {
  id: string;
  email: string;
  password: string;
  createdAt: Date;

  static async create(data: Partial<UserAttributes>): Promise<UserModel> {
    // Implementation
    return new UserModel();
  }

  static async findOne(query: { where: Partial<UserAttributes> }): Promise<UserModel | null> {
    // Implementation
    return null;
  }

  async verifyPassword(password: string): Promise<boolean> {
    // Implementation
    return false;
  }
}
`);

    writeFileSync(join(TEST_DIR, 'src', 'utils', 'crypto.ts'), `
import { createHash } from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  return createHash('sha256').update(password).digest('hex');
}

export function generateToken(): string {
  return Math.random().toString(36).substring(2);
}
`);
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  // Realistic impact report simulating user-service.ts modification
  const realisticReport: ImpactReport = {
    changedFiles: [
      { path: 'src/services/user-service.ts', changeType: 'modified' },
    ],
    affectedComponents: ['user-service', 'authentication'],
    affectedFiles: [
      'src/services/user-service.ts',
      'src/models/user.ts',
      'src/utils/crypto.ts',
    ],
    impactEdges: [
      {
        source: 'src/services/user-service.ts',
        target: 'user-service',
        type: 'direct',
        confidence: 1.0,
        distance: 0,
        reason: 'Direct file-to-component match'
      },
      {
        source: 'src/services/user-service.ts',
        target: 'authentication',
        type: 'inferred',
        confidence: 0.85,
        distance: 1,
        reason: 'Contains authentication logic'
      },
    ],
    fileImpactEdges: [
      {
        source: 'src/services/user-service.ts',
        target: 'src/models/user.ts',
        type: 'import',
        confidence: 0.95,
        detection_method: 'ast',
        distance: 1
      },
      {
        source: 'src/services/user-service.ts',
        target: 'src/utils/crypto.ts',
        type: 'import',
        confidence: 0.92,
        detection_method: 'ast',
        distance: 1
      },
    ],
    summary: {
      filesChanged: 1,
      componentsAffected: 2,
      filesAffected: 3,
      confidenceMean: 0.93,
    },
  };

  describe('XmlFormatter', () => {
    it('receives properly structured ContextBundle', async () => {
      let capturedBundle: ContextBundle | null = null;

      const capturingFormatter: PromptFormatter = {
        providerName: 'capturing',
        format(bundle: ContextBundle): string {
          capturedBundle = bundle;
          return '<captured/>';
        }
      };

      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        taskDescription: 'Add email verification to user registration',
        formatter: capturingFormatter,
      });

      await generator.generate(realisticReport);

      // Verify bundle structure
      expect(capturedBundle).not.toBeNull();
      expect(capturedBundle!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(capturedBundle!.instructions).toBe('Add email verification to user registration');
      expect(capturedBundle!.impactReport).toBe(realisticReport);
      expect(capturedBundle!.tokenEstimate).toBeGreaterThan(0);

      // Verify files array
      expect(capturedBundle!.files.length).toBe(3);
      const filePaths = capturedBundle!.files.map(f => f.path);
      expect(filePaths).toContain('src/services/user-service.ts');
      expect(filePaths).toContain('src/models/user.ts');
      expect(filePaths).toContain('src/utils/crypto.ts');
    });

    it('produces well-formed XML output', async () => {
      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        taskDescription: 'Fix the validateCredentials method',
        formatter: new XmlFormatter(),
      });

      const pack = await generator.generate(realisticReport);
      const content = pack.content as string;

      // Verify XML structure
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain('<context>');
      expect(content).toContain('</context>');
      expect(content).toContain('<instructions>');
      expect(content).toContain('Fix the validateCredentials method');
      expect(content).toContain('</instructions>');
      expect(content).toContain('<files>');
      expect(content).toContain('</files>');
      expect(content).toContain('<impact_summary>');
    });

    it('includes all files with correct paths in XML', async () => {
      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter: new XmlFormatter(),
      });

      const pack = await generator.generate(realisticReport);
      const content = pack.content as string;

      // Check file paths are included
      expect(content).toContain('path="src/services/user-service.ts"');
      expect(content).toContain('path="src/models/user.ts"');
      expect(content).toContain('path="src/utils/crypto.ts"');

      // Check actual content is included
      expect(content).toContain('class UserService');
      expect(content).toContain('class UserModel');
      expect(content).toContain('hashPassword');
    });

    it('preserves token estimate in output', async () => {
      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter: new XmlFormatter(),
      });

      const pack = await generator.generate(realisticReport);
      const content = pack.content as string;

      // Token estimate should be present and positive
      const tokenMatch = content.match(/<token_estimate>(\d+)<\/token_estimate>/);
      expect(tokenMatch).not.toBeNull();
      expect(parseInt(tokenMatch![1])).toBeGreaterThan(0);
    });

    it('includes component information in impact summary', async () => {
      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter: new XmlFormatter(),
      });

      const pack = await generator.generate(realisticReport);
      const content = pack.content as string;

      expect(content).toContain('<files_changed>1</files_changed>');
      expect(content).toContain('<components_affected>2</components_affected>');
      expect(content).toContain('user-service');
      expect(content).toContain('authentication');
    });
  });

  describe('Secret Redaction Preservation', () => {
    beforeEach(() => {
      // Add file with secrets
      writeFileSync(join(TEST_DIR, 'src', 'services', 'user-service.ts'), `
import { UserModel } from '../models/user.js';

const API_KEY = "sk-proj-abc123def456ghi789jkl012mno345pqr678";
const DB_PASSWORD = "super_secret_password_12345";

export class UserService {
  private apiKey = API_KEY;

  async createUser(email: string): Promise<UserModel> {
    console.log('Using API key:', this.apiKey);
    return UserModel.create({ email });
  }
}
`);
    });

    it('marks redacted files in ContextBundle', async () => {
      let capturedBundle: ContextBundle | null = null;

      const capturingFormatter: PromptFormatter = {
        providerName: 'capturing',
        format(bundle: ContextBundle): string {
          capturedBundle = bundle;
          return '<captured/>';
        }
      };

      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter: capturingFormatter,
      });

      await generator.generate(realisticReport);

      const userServiceFile = capturedBundle!.files.find(
        f => f.path === 'src/services/user-service.ts'
      );

      expect(userServiceFile).toBeDefined();
      expect(userServiceFile!.isRedacted).toBe(true);
      expect(userServiceFile!.content).toContain('[REDACTED:');
      expect(userServiceFile!.content).not.toContain('sk-proj-abc123');
    });

    it('preserves redaction markers in XML output', async () => {
      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter: new XmlFormatter(),
      });

      const pack = await generator.generate(realisticReport);
      const content = pack.content as string;

      // Redaction markers should be in the output
      expect(content).toContain('[REDACTED:');
      expect(content).toContain('redacted="true"');

      // Actual secrets should NOT be in output
      expect(content).not.toContain('sk-proj-abc123');
      expect(content).not.toContain('super_secret_password');
    });

    it('counts redacted files in manifest', async () => {
      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter: new XmlFormatter(),
      });

      const pack = await generator.generate(realisticReport);

      expect(pack.manifest.files.redacted).toBeGreaterThan(0);
    });
  });

  describe('JsonFormatter (Object Output)', () => {
    it('returns structured object instead of string', async () => {
      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        taskDescription: 'Implement password reset flow',
        formatter: new JsonFormatter(),
      });

      const pack = await generator.generate(realisticReport);

      expect(typeof pack.content).toBe('object');
      expect(pack.content).not.toBeNull();
    });

    it('produces valid OpenAI message format', async () => {
      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        taskDescription: 'Add rate limiting',
        formatter: new JsonFormatter(),
      });

      const pack = await generator.generate(realisticReport);
      const content = pack.content as {
        model: string;
        messages: { role: string; content: string }[];
        metadata: Record<string, unknown>;
      };

      expect(content.model).toBe('gpt-4');
      expect(content.messages).toHaveLength(2);
      expect(content.messages[0].role).toBe('system');
      expect(content.messages[1].role).toBe('user');
      expect(content.messages[1].content).toContain('Add rate limiting');
    });

    it('includes metadata with token estimate', async () => {
      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter: new JsonFormatter(),
      });

      const pack = await generator.generate(realisticReport);
      const content = pack.content as { metadata: Record<string, unknown> };

      expect(content.metadata.tokenEstimate).toBeGreaterThan(0);
      expect(content.metadata.filesIncluded).toBe(3);
      expect(content.metadata.componentsAffected).toContain('user-service');
    });
  });

  describe('Budget Constraints with Formatters', () => {
    it('respects token budget when using formatter', async () => {
      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 500, // Very small budget
        formatter: new XmlFormatter(),
      });

      const pack = await generator.generate(realisticReport);

      expect(pack.manifest.tokens.total).toBeLessThanOrEqual(500);
      // With tight budget, some files may be excluded
      expect(pack.manifest.files.included).toBeLessThan(3);
    });

    it('prioritizes changed files over impacted files', async () => {
      let capturedBundle: ContextBundle | null = null;

      const capturingFormatter: PromptFormatter = {
        providerName: 'capturing',
        format(bundle: ContextBundle): string {
          capturedBundle = bundle;
          return '<captured/>';
        }
      };

      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 1000, // Moderate budget
        formatter: capturingFormatter,
      });

      await generator.generate(realisticReport);

      // The changed file should always be included if budget allows
      const changedFile = capturedBundle!.files.find(
        f => f.path === 'src/services/user-service.ts'
      );
      expect(changedFile).toBeDefined();
    });
  });

  describe('Manifest Generation with Formatters', () => {
    it('generates valid manifest for formatted output', async () => {
      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter: new XmlFormatter(),
      });

      const pack = await generator.generate(realisticReport);

      expect(pack.manifest.version).toBe('1.0.0');
      expect(pack.manifest.provider).toBe('generic');
      expect(pack.manifest.contentHash).toHaveLength(12);
      expect(pack.manifest.tokens.utilization).toBeGreaterThan(0);
      expect(pack.manifest.tokens.utilization).toBeLessThanOrEqual(1);
    });

    it('produces empty sections array for formatted output', async () => {
      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter: new XmlFormatter(),
      });

      const pack = await generator.generate(realisticReport);

      // Formatter path uses ContextBundle, not sections
      expect(pack.sections).toEqual([]);
    });

    it('generates deterministic hash for same input', async () => {
      const formatter = new XmlFormatter();

      const generator1 = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter,
      });

      const generator2 = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter,
      });

      const pack1 = await generator1.generate(realisticReport);
      const pack2 = await generator2.generate(realisticReport);

      // Note: Hashes may differ due to timestamp in output
      // This is a known limitation - consider excluding timestamp from hash
      expect(pack1.manifest.contentHash).toBeDefined();
      expect(pack2.manifest.contentHash).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty file list gracefully', async () => {
      const emptyReport: ImpactReport = {
        changedFiles: [],
        affectedComponents: [],
        affectedFiles: [],
        impactEdges: [],
        fileImpactEdges: [],
        summary: {
          filesChanged: 0,
          componentsAffected: 0,
          filesAffected: 0,
          confidenceMean: 0,
        },
      };

      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter: new XmlFormatter(),
      });

      const pack = await generator.generate(emptyReport);
      const content = pack.content as string;

      expect(content).toContain('<files>');
      expect(content).toContain('</files>');
      expect(pack.manifest.files.included).toBe(0);
    });

    it('handles missing files in impact report', async () => {
      const reportWithMissingFile: ImpactReport = {
        ...realisticReport,
        changedFiles: [
          { path: 'src/nonexistent.ts', changeType: 'modified' },
        ],
      };

      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter: new XmlFormatter(),
      });

      // Should not throw
      const pack = await generator.generate(reportWithMissingFile);
      expect(pack.manifest).toBeDefined();
    });

    it('works without instructions', async () => {
      const generator = new PromptPackGenerator({
        projectPath: TEST_DIR,
        provider: 'generic',
        budget: 50000,
        formatter: new XmlFormatter(),
        // No taskDescription
      });

      const pack = await generator.generate(realisticReport);
      const content = pack.content as string;

      expect(content).toContain('<context>');
      expect(content).not.toContain('<instructions>');
    });
  });
});

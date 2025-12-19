import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { ImpactReport } from '../impact/index.js';
import { SecretRedactor } from '../security/index.js';
import { createEstimator, TokenEstimator } from '../tokens/index.js';
import { BudgetAllocator, ContextItem, ContextCategory, AllocationResult } from './allocator.js';
import { normalizePath } from '../utils/index.js';

export interface GeneratorOptions {
  projectPath: string;
  provider: 'claude' | 'openai' | 'generic';
  budget: number;
  taskDescription?: string;
  includeArchitecture?: boolean;
  includeContracts?: boolean;
}

export interface PromptPackManifest {
  version: string;
  provider: string;
  generatedAt: string;
  contentHash: string;
  tokens: {
    total: number;
    byCategory: Record<ContextCategory, number>;
    budget: number;
    utilization: number;
  };
  files: {
    changed: number;
    impacted: number;
    included: number;
    redacted: number;
  };
  components: {
    affected: number;
    names: string[];
  };
}

export interface PromptPack {
  manifest: PromptPackManifest;
  content: string;
  sections: PromptSection[];
  allocation: AllocationResult;
}

export interface PromptSection {
  category: ContextCategory;
  title: string;
  content: string;
  tokens: number;
  files: string[];
}

export class PromptPackGenerator {
  private redactor: SecretRedactor;
  private estimator: TokenEstimator;
  private allocator: BudgetAllocator;
  private options: GeneratorOptions;

  constructor(options: GeneratorOptions) {
    this.options = options;
    this.redactor = new SecretRedactor();
    this.estimator = createEstimator(options.provider);
    this.allocator = new BudgetAllocator(options.budget);
  }

  async generate(report: ImpactReport): Promise<PromptPack> {
    // 1. Collect context items from various sources
    const items = await this.collectContextItems(report);

    // 2. Allocate within budget
    const allocation = this.allocator.allocate(items);

    // 3. Build sections from allocated items
    const sections = this.buildSections(allocation);

    // 4. Combine into final content
    const content = this.buildContent(sections, false);

    // 5. Generate manifest
    const manifest = this.buildManifest(report, allocation, content, sections);

    return {
      manifest,
      content,
      sections,
      allocation,
    };
  }

  private async collectContextItems(report: ImpactReport): Promise<ContextItem[]> {
    const items: ContextItem[] = [];

    // Task description (highest priority)
    if (this.options.taskDescription) {
      items.push({
        category: 'task',
        content: this.options.taskDescription,
        tokens: this.estimator.estimateText(this.options.taskDescription),
        priority: 1.0,
      });
    }

    // Changed files (high priority)
    for (const change of report.changedFiles) {
      const content = this.readAndRedact(change.path);
      if (content) {
        items.push({
          category: 'changed',
          path: normalizePath(change.path),
          content: this.formatFileContent(change.path, content, change.changeType),
          tokens: this.estimator.estimateText(content),
          priority: 0.95,
          truncatable: true,
        });
      }
    }

    // Impacted files from file-level analysis (medium-high priority)
    const changedPaths = new Set(report.changedFiles.map(c => normalizePath(c.path)));
    for (const filePath of report.affectedFiles) {
      if (changedPaths.has(normalizePath(filePath))) continue; // Skip already included

      const content = this.readAndRedact(filePath);
      if (content) {
        // Find the impact edge for confidence
        const edge = report.fileImpactEdges.find(e => e.target === filePath);
        const confidence = edge?.confidence ?? 0.7;

        items.push({
          category: 'impacted',
          path: normalizePath(filePath),
          content: this.formatFileContent(filePath, content, 'impacted'),
          tokens: this.estimator.estimateText(content),
          priority: confidence,
          truncatable: true,
        });
      }
    }

    // Architecture docs (if enabled)
    if (this.options.includeArchitecture) {
      const archContent = await this.loadArchitectureDocs();
      if (archContent) {
        items.push({
          category: 'architecture',
          path: '.aidev/docs/architecture.md',
          content: archContent,
          tokens: this.estimator.estimateText(archContent),
          priority: 0.6,
          truncatable: true,
        });
      }
    }

    // Contracts (if enabled)
    if (this.options.includeContracts) {
      for (const componentName of report.affectedComponents) {
        const contractContent = await this.loadComponentContracts(componentName);
        if (contractContent) {
          items.push({
            category: 'contract',
            path: `.aidev/model/contracts/${componentName}.yaml`,
            content: contractContent,
            tokens: this.estimator.estimateText(contractContent),
            priority: 0.7,
            truncatable: false,
          });
        }
      }
    }

    return items;
  }

  private readAndRedact(filePath: string): string | null {
    const fullPath = join(this.options.projectPath, filePath);
    if (!existsSync(fullPath)) {
      // File doesn't exist - this is expected for deleted files
      return null;
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const { content: redacted } = this.redactor.redact(content);
      return redacted;
    } catch (error) {
      // Log warning for files that exist but can't be read (permissions, encoding, etc.)
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Excluding file "${filePath}" due to read error: ${message}`);
      return null;
    }
  }

  private formatFileContent(path: string, content: string, context: string): string {
    const ext = path.split('.').pop() || '';
    const lang = this.getLanguageFromExtension(ext);
    return `## File: ${path}\n**Context:** ${context}\n\n\`\`\`${lang}\n${content}\n\`\`\``;
  }

  private getLanguageFromExtension(ext: string): string {
    const map: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      yaml: 'yaml',
      yml: 'yaml',
      json: 'json',
      md: 'markdown',
      sql: 'sql',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      java: 'java',
      kt: 'kotlin',
      cs: 'csharp',
      css: 'css',
      html: 'html',
      sh: 'bash',
    };
    return map[ext] || ext;
  }

  private async loadArchitectureDocs(): Promise<string | null> {
    const paths = [
      join(this.options.projectPath, '.aidev', 'docs', 'architecture.md'),
      join(this.options.projectPath, 'ARCHITECTURE.md'),
      join(this.options.projectPath, 'docs', 'architecture.md'),
    ];

    for (const p of paths) {
      if (existsSync(p)) {
        try {
          return readFileSync(p, 'utf-8');
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  private async loadComponentContracts(componentName: string): Promise<string | null> {
    const contractPath = join(
      this.options.projectPath,
      '.aidev',
      'model',
      'contracts',
      `${componentName}.yaml`
    );

    if (!existsSync(contractPath)) {
      return null;
    }

    try {
      return readFileSync(contractPath, 'utf-8');
    } catch {
      return null;
    }
  }

  private buildSections(allocation: AllocationResult): PromptSection[] {
    const sections: PromptSection[] = [];
    const byCategory = new Map<ContextCategory, ContextItem[]>();

    // Group allocated items by category
    for (const item of allocation.allocated) {
      const list = byCategory.get(item.category) || [];
      list.push(item);
      byCategory.set(item.category, list);
    }

    // Build sections in priority order
    const categoryOrder: ContextCategory[] = [
      'task',
      'changed',
      'impacted',
      'contract',
      'architecture',
      'decision',
    ];

    const categoryTitles: Record<ContextCategory, string> = {
      task: 'Task Description',
      changed: 'Changed Files',
      impacted: 'Impacted Files',
      contract: 'Component Contracts',
      architecture: 'Architecture Documentation',
      decision: 'Design Decisions',
    };

    for (const category of categoryOrder) {
      const items = byCategory.get(category);
      if (!items || items.length === 0) continue;

      const content = items.map(i => i.content).join('\n\n---\n\n');
      const files = items.filter(i => i.path).map(i => i.path!);
      const tokens = items.reduce((sum, i) => sum + i.tokens, 0);

      sections.push({
        category,
        title: categoryTitles[category],
        content,
        tokens,
        files,
      });
    }

    return sections;
  }

  private buildContent(sections: PromptSection[], forHash: boolean = false): string {
    const parts: string[] = [];

    parts.push('# AI Development Context Pack\n');
    // Only include timestamp in display content, not for hashing
    if (!forHash) {
      parts.push(`Generated: ${new Date().toISOString()}\n`);
    }
    parts.push(`Provider: ${this.options.provider}\n`);
    parts.push('---\n');

    for (const section of sections) {
      parts.push(`\n# ${section.title}\n`);
      parts.push(`**Files:** ${section.files.length} | **Tokens:** ~${section.tokens}\n\n`);
      parts.push(section.content);
      parts.push('\n');
    }

    return parts.join('');
  }

  private buildManifest(
    report: ImpactReport,
    allocation: AllocationResult,
    content: string,
    sections: PromptSection[]
  ): PromptPackManifest {
    // Hash content without timestamp for determinism
    const hashableContent = this.buildContent(sections, true);
    const contentHash = createHash('sha256').update(hashableContent).digest('hex').slice(0, 12);

    const redactedCount = allocation.allocated.filter(
      item => item.content.includes('[REDACTED:')
    ).length;

    return {
      version: '1.0.0',
      provider: this.options.provider,
      generatedAt: new Date().toISOString(),
      contentHash,
      tokens: {
        total: allocation.totalTokens,
        byCategory: allocation.budgetUsed,
        budget: this.options.budget,
        utilization: allocation.totalTokens / this.options.budget,
      },
      files: {
        changed: report.changedFiles.length,
        impacted: report.affectedFiles.length - report.changedFiles.length,
        included: allocation.allocated.filter(i => i.path).length,
        redacted: redactedCount,
      },
      components: {
        affected: report.affectedComponents.length,
        names: report.affectedComponents,
      },
    };
  }
}

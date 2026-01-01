import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { ImpactReport } from '../impact/index.js';
import { SecretRedactor } from '../security/index.js';
import { createEstimator, TokenEstimator } from '../tokens/index.js';
import { BudgetAllocator, ContextItem, ContextCategory, AllocationResult } from './allocator.js';
import { normalizePath } from '../utils/index.js';
import { PromptFormatter, ContextBundle } from './types.js';
import { ClaudeFormatter } from './formatters/claude.js';
import { OpenAIFormatter } from './formatters/openai.js';
import { UniversalFormatter } from './formatters/universal.js';
import { TypeScriptSkeletonExtractor } from '../scanners/index.js';
import { Preset } from './presets/types.js';
import { interpolate } from './presets/interpolator.js';
import { Historian } from './advisors/historian.js';
import { Architect } from './advisors/architect.js';
import { Visionary } from './advisors/visionary.js';
import { CouncilInsight } from './advisors/base.js';
import { GitHistoryService } from '../git/index.js';
import { DistillationEngine } from './distillation.js';

/**
 * Configuration options for the PromptPackGenerator.
 */
export interface GeneratorOptions {
  /**
   * Absolute path to the project root.
   */
  projectPath: string;
  
  /**
   * Target LLM provider for token estimation and default formatting.
   */
  provider: 'claude' | 'openai' | 'generic' | 'universal';
  
  /**
   * Maximum allowed tokens for the entire context pack.
   */
  budget: number;
  
  /**
   * Optional description of the task being performed.
   */
  taskDescription?: string;

  /**
   * Whether to use structural skeletons for dependencies to save tokens.
   */
  useSkeletons?: boolean;
  
  /**
   * Whether to include architecture documentation in the pack.
   */
  includeArchitecture?: boolean;
  
  /**
   * Whether to include component contracts in the pack.
   */
  includeContracts?: boolean;
  
  /**
   * Optional custom formatter for provider-specific output.
   */
  formatter?: PromptFormatter;

  /**
   * Optional preset to structure the prompt.
   */
  preset?: Preset;
}

/**
 * Metadata about the generated prompt pack.
 */
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

/**
 * The final output of the prompt pack generation process.
 */
export interface PromptPack {
  manifest: PromptPackManifest;
  content: string | object;
  sections: PromptSection[];
  allocation: AllocationResult;
  insights: CouncilInsight[]; // Add this
}

/**
 * A grouped section of content in a legacy prompt pack.
 */
export interface PromptSection {
  category: ContextCategory;
  title: string;
  content: string;
  tokens: number;
  files: string[];
}

/**
 * Orchestrates the collection, allocation, and formatting of code context for AI prompts.
 * 
 * The generator:
 * 1. Collects relevant files and documentation based on an ImpactReport.
 * 2. Redacts secrets from the content.
 * 3. Allocates space for each item within a token budget.
 * 4. Delegates formatting to a PromptFormatter for the final output.
 */
export class PromptPackGenerator {
  private redactor: SecretRedactor;
  private estimator: TokenEstimator;
  private allocator: BudgetAllocator;
  private options: GeneratorOptions;
  private tsSkeletonExtractor: TypeScriptSkeletonExtractor;
  private advisors: (Historian | Architect | Visionary)[];
  private gitHistory: GitHistoryService;
  private distillation: DistillationEngine;

  constructor(options: GeneratorOptions) {
    this.options = options;
    this.redactor = new SecretRedactor();
    this.estimator = createEstimator(options.provider);
    this.allocator = new BudgetAllocator(options.budget);
    this.tsSkeletonExtractor = new TypeScriptSkeletonExtractor();
    this.advisors = [
      new Historian(),
      new Architect(),
      new Visionary()
    ];
    this.gitHistory = new GitHistoryService(options.projectPath);
    this.distillation = new DistillationEngine(options.projectPath);
  }

  /**
   * Generates a complete PromptPack from an ImpactReport.
   * 
   * @param report - The impact analysis results.
   * @returns A promise that resolves to the generated PromptPack.
   */
  async generate(report: ImpactReport): Promise<PromptPack> {
    const formatter = this.options.formatter || this.getFormatter(this.options.provider);
    
    if (this.options.preset) {
      return this.generateWithPreset(report, this.options.preset, formatter);
    }

    if (formatter) {
      return this.generateWithFormatter(report, formatter);
    }
    return this.generateLegacy(report);
  }

  /**
   * Internal helper to select a formatter based on the provider name.
   */
  private getFormatter(provider: string): PromptFormatter | undefined {
    switch (provider.toLowerCase()) {
      case 'claude':
        return new ClaudeFormatter();
      case 'openai':
        return new OpenAIFormatter();
      case 'universal':
        return new UniversalFormatter();
      default:
        return undefined;
    }
  }

  private async generateWithPreset(report: ImpactReport, preset: Preset, formatter?: PromptFormatter): Promise<PromptPack> {
    // 1. Collect raw context items
    const items = await this.collectContextItems(report, true);

    // 2. Allocate within budget
    const allocation = this.allocator.allocate(items);

    // 2.1 The Distillation Loop (Source -> Brain)
    const anchorPaths = report.changedFiles.map(f => f.path);
    const insights: CouncilInsight[] = [];
    if (anchorPaths.length > 0) {
      try {
        const commits = await this.gitHistory.getRecentCommits(anchorPaths, 5);
        await this.distillation.distillCommits(commits);
      } catch (error) {
        console.warn('Distillation loop failed:', error);
      }
    }

    // 2.5 Collect Council Insights (Brain -> Voice)
    for (const advisor of this.advisors) {
      const results = await advisor.provideInsights(anchorPaths);
      insights.push(...results);
    }

    // 3. Build ContextBundle
    const bundle: ContextBundle = {
      timestamp: new Date().toISOString(),
      impactReport: report,
      insights, // Inject into bundle
      files: allocation.allocated
        .filter(i => i.path)
        .map(i => {
          let content = i.content;
          const isTS = i.path!.endsWith('.ts') || i.path!.endsWith('.tsx');
          
          if (i.fidelity === 'skeleton' && isTS) {
            content = this.tsSkeletonExtractor.extractSkeleton(content);
          }

          return {
            path: i.path!,
            content: content,
            isRedacted: content.includes('[REDACTED:'),
            isSkeleton: i.fidelity === 'skeleton',
            reason: i.reason,
          };
        }),
      instructions: this.options.taskDescription,
      tokenEstimate: allocation.totalTokens,
      preset: preset,
    };

    // 4. Interpolate Preset Content
    // We interpolate variables into the preset content.
    // Available variables:
    // - {{task}}: The task description
    // - {{context_files}}: The list of files (if we want to embed them directly in the template, though formatters usually handle this)
    // - {{context_summary}}: Summary of impact
    
    // Actually, the Preset is a "System Instruction" or "Guidance" layer.
    // The *Formatter* is still responsible for the final wire format (XML/JSON).
    // The Preset content is *part* of the prompt.
    
    // If a formatter is present, we let it handle the bundle, which now includes the preset.
    // The formatter should check for bundle.preset and use it.
    
    // BUT, if the preset *defines* the structure (e.g. "output.format"), we might need to respect that?
    // The spec says: "The prompt pack includes a “Why included” relationship summary... Presets are extensible..."
    // "Each preset injects: role/system guidance, structured workflow, explicit output requirements"
    
    // So the Preset content *is* the System Prompt (or part of it).
    
    // Let's interpolate variables into the preset content first.
    const variables: Record<string, string> = {
      task: this.options.taskDescription || '',
      // Add more variables as needed
    };
    
    // We might need to catch missing variables here or in the interpolator.
    // For now, let's assume the interpolator throws and we might want to catch/warn or let it fail.
    // The interpolator throws, which is good.
    
    // We update the preset in the bundle with the interpolated content.
    const interpolatedPreset = {
      ...preset,
      content: interpolate(preset.content, variables)
    };
    
    const bundleWithInterpolatedPreset = {
      ...bundle,
      preset: interpolatedPreset
    };

    let content: string | object;
    
    if (formatter) {
      // If we have a formatter, use it. The formatter needs to know how to use the preset.
      // We will update formatters in Phase 3/4 to use this.
      // For now, we pass the bundle with the preset.
      content = formatter.format(bundleWithInterpolatedPreset, { timestamp: 'STABLE_TIMESTAMP' });
    } else {
      // Fallback if no formatter (e.g. text/markdown output based on preset?)
      // For now, let's just return the preset content joined with the files if no formatter.
      // But we usually have a default formatter (Claude/OpenAI).
      // If generic provider, maybe we just return text?
      content = interpolatedPreset.content + '\n\n' + items.map(i => i.content).join('\n\n');
    }

    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    const manifest = this.buildManifest(report, allocation, contentString, []);

    return {
      manifest,
      content,
      sections: [],
      allocation,
      insights, // Include insights
    };
  }

  /**
   * Generation flow using the new PromptFormatter architecture.
   */
  private async generateWithFormatter(report: ImpactReport, formatter: PromptFormatter): Promise<PromptPack> {
    // 1. Collect raw context items (no markdown formatting)
    const items = await this.collectContextItems(report, true);

    // 2. Allocate within budget
    const allocation = this.allocator.allocate(items);

    // 2.1 The Distillation Loop (Source -> Brain)
    const anchorPaths = report.changedFiles.map(f => f.path);
    const insights: CouncilInsight[] = [];
    if (anchorPaths.length > 0) {
      try {
        const commits = await this.gitHistory.getRecentCommits(anchorPaths, 5);
        await this.distillation.distillCommits(commits);
      } catch (error) {
        console.warn('Distillation loop failed:', error);
      }
    }

    // 2.5 Collect Council Insights (Brain -> Voice)
    for (const advisor of this.advisors) {
      const results = await advisor.provideInsights(anchorPaths);
      insights.push(...results);
    }

    // 3. Build ContextBundle
    const bundle: ContextBundle = {
      timestamp: new Date().toISOString(),
      impactReport: report,
      insights, // Inject into bundle
      files: allocation.allocated
        .filter(i => i.path)
        .map(i => {
          let content = i.content;
          const isTS = i.path!.endsWith('.ts') || i.path!.endsWith('.tsx');
          
          if (i.fidelity === 'skeleton' && isTS) {
            content = this.tsSkeletonExtractor.extractSkeleton(content);
          }

          return {
            path: i.path!,
            content: content,
            isRedacted: content.includes('[REDACTED:'),
            isSkeleton: i.fidelity === 'skeleton',
            reason: i.reason,
          };
        }),
      instructions: this.options.taskDescription,
      tokenEstimate: allocation.totalTokens
    };

    // 4. Format
    // Use a fixed timestamp for hashing to ensure determinism, 
    // but the actual output content will use the real bundle timestamp if needed.
    // However, buildManifest uses the result of this call.
    // To ensure manifest.contentHash is deterministic, we MUST format with a fixed string.
    const content = formatter.format(bundle, { timestamp: 'STABLE_TIMESTAMP' });

    // 5. Generate manifest (contentHash depends on formatted output string)
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    const manifest = this.buildManifest(report, allocation, contentString, []);

    return {
      manifest,
      content,
      sections: [],
      allocation,
      insights, // Include insights
    };
  }

  /**
   * Generation flow using legacy markdown formatting.
   */
  private async generateLegacy(report: ImpactReport): Promise<PromptPack> {
    // 1. Collect context items with markdown formatting
    const items = await this.collectContextItems(report, false);

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
      insights: [], // Legacy mode doesn't run advisors
    };
  }

  /**
   * Collects and prepares context items from various sources.
   */
  private async collectContextItems(report: ImpactReport, raw: boolean): Promise<ContextItem[]> {
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
        const itemContent = raw 
          ? content 
          : this.formatFileContent(change.path, content, change.changeType);
          
        items.push({
          category: 'changed',
          path: normalizePath(change.path),
          content: itemContent,
          tokens: this.estimator.estimateText(itemContent),
          priority: 0.95,
          truncatable: true,
          reason: 'Changed file',
        });
      }
    }

    // Impacted files from file-level analysis (medium-high priority)
    const changedPaths = new Set(report.changedFiles.map(c => normalizePath(c.path)));
    for (const filePath of report.affectedFiles) {
      if (changedPaths.has(normalizePath(filePath))) continue; // Skip already included

      let content = this.readAndRedact(filePath);
      if (content) {
        // Apply skeleton extraction if enabled and file is TypeScript/JavaScript
        const isTS = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
        if (this.options.useSkeletons && isTS) {
          content = this.tsSkeletonExtractor.extractSkeleton(content);
        }

        // Find the impact edge for confidence
        const edge = report.fileImpactEdges.find(e => e.target === filePath);
        const confidence = edge?.confidence ?? 0.7;
        
        let reason = 'Impacted file';
        if (edge) {
            reason = `Imported by ${edge.source}`; // Simplified reason
        }

        const itemContent = raw 
          ? content 
          : this.formatFileContent(filePath, content, 'impacted');

        items.push({
          category: 'impacted',
          path: normalizePath(filePath),
          content: itemContent,
          tokens: this.estimator.estimateText(itemContent),
          priority: confidence,
          truncatable: true,
          reason,
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

  /**
   * Reads a file and applies secret redaction.
   */
  private readAndRedact(filePath: string): string | null {
    const fullPath = join(this.options.projectPath, filePath);
    if (!existsSync(fullPath)) {
      return null;
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const { content: redacted } = this.redactor.redact(content);
      return redacted;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Excluding file "${filePath}" due to read error: ${message}`);
      return null;
    }
  }

  /**
   * Formats a file's content for legacy markdown output.
   */
  private formatFileContent(path: string, content: string, context: string): string {
    const ext = path.split('.').pop() || '';
    const lang = this.getLanguageFromExtension(ext);
    return `## File: ${path}\n**Context:** ${context}\n\n\`\`\`${lang}\n${content}\n\`\`\``;
  }

  /**
   * Maps file extensions to markdown language identifiers.
   */
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

  /**
   * Loads architecture documentation from standard locations.
   */
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

  /**
   * Loads contracts for a specific component.
   */
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

  /**
   * Groups allocated items into sections for legacy output.
   */
  private buildSections(allocation: AllocationResult): PromptSection[] {
    const sections: PromptSection[] = [];
    const byCategory = new Map<ContextCategory, ContextItem[]>();

    for (const item of allocation.allocated) {
      const list = byCategory.get(item.category) || [];
      list.push(item);
      byCategory.set(item.category, list);
    }

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

  /**
   * Combines sections into a single markdown string for legacy output.
   */
  private buildContent(sections: PromptSection[], forHash: boolean = false): string {
    const parts: string[] = [];

    parts.push('# AI Development Context Pack\n');
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

  /**
   * Constructs the final manifest including metadata and content hash.
   */
  private buildManifest(
    report: ImpactReport,
    allocation: AllocationResult,
    content: string,
    sections: PromptSection[]
  ): PromptPackManifest {
    let hashableContent = content;
    if (sections.length > 0 && !this.options.formatter) {
        hashableContent = this.buildContent(sections, true);
    }
    
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

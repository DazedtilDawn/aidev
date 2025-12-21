import { ImpactReport } from '../impact/analyzer.js';

/**
 * Represents a single file included in the context bundle.
 * Files are collected based on impact analysis and filtered by token budget.
 */
export interface ContextFile {
  /**
   * Relative path from project root (normalized with forward slashes).
   * @example "src/services/user-service.ts"
   */
  path: string;

  /**
   * File content after secret redaction. May contain [REDACTED:type] markers.
   * Content is raw (no markdown formatting) when using formatters.
   */
  content: string;

  /**
   * True if content contains redacted secrets.
   * Detected by presence of [REDACTED: markers in content.
   * @example true // if content contains "[REDACTED:api_key]"
   */
  isRedacted?: boolean;
}

/**
 * The complete context bundle passed to formatters.
 * Contains all information needed to generate provider-specific prompts.
 *
 * @remarks
 * The bundle is constructed by PromptPackGenerator after:
 * 1. Collecting files from ImpactReport
 * 2. Redacting secrets from file contents
 * 3. Allocating within token budget
 *
 * @example
 * ```typescript
 * const bundle: ContextBundle = {
 *   timestamp: "2025-01-15T10:30:00.000Z",
 *   impactReport: { changedFiles: [...], affectedComponents: [...], ... },
 *   files: [
 *     { path: "src/auth.ts", content: "export function login...", isRedacted: false }
 *   ],
 *   instructions: "Add password validation",
 *   tokenEstimate: 2500
 * };
 * ```
 */
export interface ContextBundle {
  /**
   * ISO 8601 timestamp of bundle generation.
   * @example "2025-01-15T10:30:00.000Z"
   */
  timestamp: string;

  /**
   * The impact analysis report that determined which files to include.
   * Contains changedFiles, affectedComponents, and dependency edges.
   */
  impactReport: ImpactReport;

  /**
   * Files selected for the prompt, filtered by token budget.
   * Ordered by priority: changed files first, then impacted files by confidence.
   */
  files: ContextFile[];

  /**
   * User-provided task description or instructions.
   * Passed via --task flag or taskDescription option.
   * @example "Fix the authentication bypass vulnerability"
   */
  instructions?: string;

  /**
   * Estimated token count for all included content.
   * Uses provider-specific estimation (cl100k for OpenAI, claude for Anthropic).
   */
  tokenEstimate?: number;
}

/**
 * Interface for provider-specific prompt formatters.
 *
 * Formatters transform a ContextBundle into the expected input format for
 * different LLM providers. They handle output structure (XML, JSON, markdown)
 * while the generator handles file collection and budget allocation.
 *
 * ## Contract
 *
 * Formatters MUST:
 * - Accept a ContextBundle and return string or object
 * - Preserve file paths exactly as received
 * - Preserve redaction markers (e.g., `[REDACTED:api_key]`)
 * - Include all files from bundle.files in output
 * - Be stateless (no side effects, deterministic for same input)
 *
 * Formatters SHOULD:
 * - Include bundle.instructions if present
 * - Include bundle.tokenEstimate for debugging
 * - Include bundle.impactReport.affectedComponents for context
 *
 * Formatters MUST NOT:
 * - Read files from disk (content is pre-loaded)
 * - Modify or remove redaction markers
 * - Estimate tokens (already provided in bundle)
 *
 * ## Example Implementations
 *
 * ### XML Formatter (Claude-style)
 * ```typescript
 * const claudeFormatter: PromptFormatter = {
 *   providerName: 'claude',
 *   format(bundle: ContextBundle): string {
 *     return `<context>
 *       <instructions>${bundle.instructions ?? ''}</instructions>
 *       <files>
 *         ${bundle.files.map(f => `
 *           <file path="${f.path}">
 *             <![CDATA[${f.content}]]>
 *           </file>
 *         `).join('')}
 *       </files>
 *     </context>`;
 *   }
 * };
 * ```
 *
 * ### JSON Formatter (OpenAI-style)
 * ```typescript
 * const openaiFormatter: PromptFormatter = {
 *   providerName: 'openai',
 *   format(bundle: ContextBundle): object {
 *     return {
 *       model: 'gpt-4',
 *       messages: [
 *         { role: 'system', content: 'You are a helpful assistant.' },
 *         { role: 'user', content: bundle.instructions + '\n\n' +
 *           bundle.files.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n')
 *         }
 *       ]
 *     };
 *   }
 * };
 * ```
 *
 * @see tests/prompt-formatter-integration.test.ts for comprehensive examples
 */
export interface PromptFormatter {
  /**
   * Transform the context bundle into provider-specific format.
   *
   * @param bundle - The complete context with files, instructions, and metadata
   * @returns Formatted output - string for XML/text, object for JSON APIs
   *
   * @example String output (Claude XML)
   * ```typescript
   * format(bundle) {
   *   return `<context>...</context>`;
   * }
   * ```
   *
   * @example Object output (OpenAI JSON)
   * ```typescript
   * format(bundle) {
   *   return { model: 'gpt-4', messages: [...] };
   * }
   * ```
   */
  format(bundle: ContextBundle): string | object;

  /**
   * Identifier for the target provider/format.
   * Used in logging and manifest generation.
   * @example "claude" | "openai" | "generic"
   */
  providerName: string;
}

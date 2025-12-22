import { readFileSync, existsSync } from 'fs';
import { TypeScriptSkeletonExtractor } from '../scanners/index.js';
import { ContextBundle } from './types.js';
import { PromptFormatter } from './types.js';
import { UniversalFormatter } from './formatters/universal.js';
import { PresetResolver } from './presets/resolver.js';
import { interpolate } from './presets/interpolator.js';

/**
 * Orchestrates the generation of unit test scaffolding.
 * Uses skeletons to provide high-signal context without implementation bias.
 */
export class TestGenerator {
  private skeletonExtractor: TypeScriptSkeletonExtractor;
  private presetResolver: PresetResolver;

  constructor() {
    this.skeletonExtractor = new TypeScriptSkeletonExtractor();
    this.presetResolver = new PresetResolver();
  }

  /**
   * Generates a prompt bundle for test scaffolding.
   * 
   * @param filePath Path to the source file to generate tests for.
   * @param content Full content of the source file.
   * @returns A string representing the formatted prompt.
   */
  async generateTestPrompt(filePath: string, content: string): Promise<string> {
    const skeleton = this.skeletonExtractor.extractSkeleton(content);
    const preset = await this.presetResolver.resolve('test-gen');

    if (!preset) {
      throw new Error('Could not resolve "test-gen" preset');
    }

    // Interpolate variables into the preset content
    const variables: Record<string, string> = {
      task: filePath,
    };
    const interpolatedContent = interpolate(preset.content, variables);

    const bundle: ContextBundle = {
      timestamp: new Date().toISOString(),
      impactReport: {
        changedFiles: [{ path: filePath, changeType: 'modified' }],
        affectedComponents: [],
        affectedFiles: [filePath],
        impactEdges: [],
        fileImpactEdges: [],
        summary: {
          filesChanged: 1,
          componentsAffected: 0,
          filesAffected: 1,
          confidenceMean: 1.0
        }
      },
      files: [
        {
          path: filePath,
          content: skeleton,
          isSkeleton: true,
          reason: 'Target for test generation'
        }
      ],
      instructions: interpolatedContent,
      preset: {
        ...preset,
        content: interpolatedContent
      }
    };

    const formatter = new UniversalFormatter();
    return formatter.format(bundle, { timestamp: 'STABLE_TIMESTAMP' }) as string;
  }
}

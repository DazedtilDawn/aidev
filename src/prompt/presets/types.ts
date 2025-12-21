import { z } from 'zod';

/**
 * Zod schema for the Preset configuration (frontmatter).
 */
export const PresetConfigSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  output: z.object({
    format: z.enum(['unified_diff', 'xml', 'json', 'text']),
    allow_changes_outside_changed_files: z.boolean().default(false),
    include_tests: z.enum(['always', 'never', 'if_needed']).default('if_needed'),
  }).optional(),
});

export type PresetConfig = z.infer<typeof PresetConfigSchema>;

/**
 * Represents a fully loaded prompt preset.
 */
export interface Preset {
  /**
   * Configuration parsed from frontmatter.
   */
  config: PresetConfig;

  /**
   * Raw content body (the template itself).
   */
  content: string;

  /**
   * Source file path (if loaded from disk).
   */
  sourcePath?: string;
}

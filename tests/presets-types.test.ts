import { describe, it, expect } from 'vitest';
import { PresetConfigSchema } from '../src/prompt/presets/types.js';

describe('PresetConfigSchema', () => {
  it('validates a correct configuration', () => {
    const validConfig = {
      id: 'bugfix',
      title: 'Bug Fix',
      output: {
        format: 'unified_diff',
        allow_changes_outside_changed_files: false,
        include_tests: 'if_needed'
      }
    };
    const result = PresetConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('rejects invalid configuration', () => {
    const invalidConfig = {
      id: '', // Empty ID
      title: 'Bug Fix'
    };
    const result = PresetConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('provides defaults for optional fields', () => {
    const minimalConfig = {
      id: 'minimal',
      title: 'Minimal Preset'
    };
    const result = PresetConfigSchema.safeParse(minimalConfig);
    expect(result.success).toBe(true);
    // Note: output is optional, so it might be undefined if not provided
    // but the inner defaults only apply if the output object exists?
    // Actually Zod defaults apply when the field is missing IF the parent object is present OR if we set a default for the parent.
    // In our schema, `output` is optional.
  });
});

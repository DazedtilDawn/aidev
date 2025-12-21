import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PresetResolver } from '../src/prompt/presets/resolver.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_PRESETS_DIR = 'C:\\dev\\AIDEV\\tests\\fixtures\\presets';

describe('PresetResolver', () => {
  beforeEach(() => {
    mkdirSync(TEST_PRESETS_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_PRESETS_DIR, { recursive: true, force: true });
  });

  it('loads a local preset from file', async () => {
    const presetPath = join(TEST_PRESETS_DIR, 'custom.md');
    const presetContent = `---\nid: custom\ntitle: Custom Preset\n---\n# System Instructions\nCustom instructions.
`;
    writeFileSync(presetPath, presetContent);

    const resolver = new PresetResolver();
    const preset = await resolver.resolve(presetPath);

    expect(preset).toBeDefined();
    expect(preset?.config.id).toBe('custom');
    expect(preset?.config.title).toBe('Custom Preset');
    expect(preset?.content).toContain('# System Instructions');
  });

  it('returns undefined for non-existent preset', async () => {
    const resolver = new PresetResolver();
    const preset = await resolver.resolve('non-existent');
    expect(preset).toBeUndefined();
  });

  it('parses frontmatter correctly', async () => {
     const presetPath = join(TEST_PRESETS_DIR, 'test.md');
    const presetContent = `---\nid: test\ntitle: Test Preset\noutput:\n  format: json\n  include_tests: never\n--- \nBody content\n`;
    writeFileSync(presetPath, presetContent);

    const resolver = new PresetResolver();
    const preset = await resolver.resolve(presetPath);

    expect(preset?.config.output?.format).toBe('json');
    expect(preset?.config.output?.include_tests).toBe('never');
    expect(preset?.content.trim()).toBe('Body content');
  });
});

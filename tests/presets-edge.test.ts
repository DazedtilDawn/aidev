import { describe, it, expect } from 'vitest';
import { PresetResolver } from '../src/prompt/presets/resolver.js';

describe('Edge Analyst Preset', () => {
  it('should resolve the edge-analyst preset', async () => {
    const resolver = new PresetResolver();
    const preset = await resolver.resolve('edge-analyst');
    
    expect(preset).toBeDefined();
    expect(preset?.config.id).toBe('edge-analyst');
    expect(preset?.config.title).toBe('Edge Analyst');
    expect(preset?.content).toContain('# EDGECRAFT');
  });
});

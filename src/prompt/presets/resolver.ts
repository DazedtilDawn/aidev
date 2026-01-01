import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { Preset, PresetConfigSchema } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PresetResolver {
  /**
   * List all available built-in presets.
   */
  async list(): Promise<Array<{ id: string; title: string }>> {
    const templatesDir = join(__dirname, 'templates');
    if (!existsSync(templatesDir)) {
      return [];
    }

    const files = readdirSync(templatesDir).filter(f => f.endsWith('.md'));
    const presets: Array<{ id: string; title: string }> = [];

    for (const file of files) {
      const preset = this.loadFromFile(join(templatesDir, file));
      if (preset) {
        presets.push({
          id: preset.config.id,
          title: preset.config.title,
        });
      }
    }

    return presets;
  }

  /**
   * Resolve a preset by name or path.
   * 
   * @param nameOrPath - Preset name (e.g. 'bugfix') or file path.
   */
  async resolve(nameOrPath: string): Promise<Preset | undefined> {
    // 1. Check if it's a file path
    if (existsSync(nameOrPath)) {
      return this.loadFromFile(nameOrPath);
    }

    // 2. Check built-ins
    const builtInPath = join(__dirname, 'templates', `${nameOrPath}.md`);
    if (existsSync(builtInPath)) {
      return this.loadFromFile(builtInPath);
    }
    
    return undefined;
  }

  private loadFromFile(path: string): Preset | undefined {
    try {
      const fileContent = readFileSync(path, 'utf-8');
      const { data, content } = matter(fileContent);
      
      // Validate config
      const config = PresetConfigSchema.parse(data);

      return {
        config,
        content,
        sourcePath: path,
      };
    } catch (error) {
      console.warn(`Failed to load preset from ${path}:`, error);
      return undefined;
    }
  }
}

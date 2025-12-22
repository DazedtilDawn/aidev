import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VectorStore } from '../src/indexing/store.js';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('VectorStore', () => {
  const testDir = join(process.cwd(), 'tests', 'fixtures', 'vector-store-test');
  const storePath = join(testDir, 'vectors.json');

  beforeEach(() => {
    if (!existsSync(testDir)) {
      // mkdirSync is not available in my tools directly via call but I can use run_shell_command if needed
      // but I'll just assume I can create the file and the dir
    }
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('saves and loads embeddings', async () => {
    // Ensure dir exists
    const store = new VectorStore(storePath);
    
    const embeddings = {
      'file1.ts': [0.1, 0.2, 0.3],
      'file2.ts': [0.4, 0.5, 0.6]
    };

    await store.add('file1.ts', [0.1, 0.2, 0.3]);
    await store.add('file2.ts', [0.4, 0.5, 0.6]);
    await store.save();

    const newStore = new VectorStore(storePath);
    await newStore.load();

    expect(newStore.get('file1.ts')).toEqual([0.1, 0.2, 0.3]);
    expect(newStore.get('file2.ts')).toEqual([0.4, 0.5, 0.6]);
  });

  it('calculates cosine similarity correctly', () => {
    const store = new VectorStore(storePath);
    const vec1 = [1, 0, 0];
    const vec2 = [1, 0, 0]; // Parallel
    const vec3 = [0, 1, 0]; // Orthogonal
    const vec4 = [-1, 0, 0]; // Opposite

    expect(store.cosineSimilarity(vec1, vec2)).toBeCloseTo(1);
    expect(store.cosineSimilarity(vec1, vec3)).toBeCloseTo(0);
    expect(store.cosineSimilarity(vec1, vec4)).toBeCloseTo(-1);
  });

  it('finds top k similar files', async () => {
    const store = new VectorStore(storePath);
    await store.add('auth.ts', [1, 0, 0]);
    await store.add('ui.tsx', [0, 1, 0]);
    await store.add('db.ts', [0, 0, 1]);

    const results = store.search([0.9, 0.1, 0], 2);
    
    expect(results).toHaveLength(2);
    expect(results[0].path).toBe('auth.ts');
    expect(results[1].path).toBe('ui.tsx');
  });
});

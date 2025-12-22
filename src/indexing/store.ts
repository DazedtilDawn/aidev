import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface VectorEntry {
  path: string;
  vector: number[];
  score?: number;
}

export class VectorStore {
  private filePath: string;
  private vectors: Map<string, number[]> = new Map();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async add(path: string, vector: number[]): Promise<void> {
    this.vectors.set(path, vector);
  }

  get(path: string): number[] | undefined {
    return this.vectors.get(path);
  }

  async save(): Promise<void> {
    const data = Object.fromEntries(this.vectors);
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async load(): Promise<void> {
    if (!existsSync(this.filePath)) {
      this.vectors = new Map();
      return;
    }
    const content = readFileSync(this.filePath, 'utf-8');
    const data = JSON.parse(content);
    this.vectors = new Map(Object.entries(data));
  }

  /**
   * Search for top K similar files.
   */
  search(queryVector: number[], topK: number = 5): VectorEntry[] {
    const results: VectorEntry[] = [];

    for (const [path, vector] of this.vectors.entries()) {
      const score = this.cosineSimilarity(queryVector, vector);
      results.push({ path, vector, score });
    }

    return results
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, topK);
  }

  /**
   * Calculate cosine similarity between two vectors.
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export interface EmbeddingOptions {
  endpoint: string;
  model?: string;
}

export class EmbeddingClient {
  private endpoint: string;
  private model: string;

  constructor(options: EmbeddingOptions) {
    this.endpoint = options.endpoint;
    this.model = options.model || 'nomic-embed-text-v1.5';
  }

  /**
   * Get embeddings for one or more strings.
   */
  async getEmbeddings(input: string | string[]): Promise<number[][]> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          model: this.model,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API failed: ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      // Handle both OpenAI and LM Studio formats
      const results = data.data || data;
      if (!Array.isArray(results)) {
        console.error('Embedding API response:', JSON.stringify(data, null, 2));
        throw new Error('Invalid response format from embedding API: data is not an array');
      }

      // Sort by index if present to ensure order matches input
      const sorted = results.sort((a: any, b: any) => (a.index || 0) - (b.index || 0));
      return sorted.map((item: any) => item.embedding);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unknown error in EmbeddingClient: ${String(error)}`);
    }
  }
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbeddingClient } from '../src/embeddings/client.js';

describe('EmbeddingClient', () => {
  const mockEndpoint = 'http://localhost:1234/v1/embeddings';
  
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('gets embeddings for a single string', async () => {
    const mockResponse = {
      data: [
        { embedding: [0.1, 0.2, 0.3], index: 0 }
      ]
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const client = new EmbeddingClient({ endpoint: mockEndpoint });
    const result = await client.getEmbeddings('test input');

    expect(fetch).toHaveBeenCalledWith(mockEndpoint, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        input: 'test input',
        model: 'nomic-embed-text-v1.5'
      })
    }));
    expect(result).toEqual([[0.1, 0.2, 0.3]]);
  });

  it('gets embeddings for an array of strings', async () => {
    const mockResponse = {
      data: [
        { embedding: [0.1, 0.1], index: 0 },
        { embedding: [0.2, 0.2], index: 1 }
      ]
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const client = new EmbeddingClient({ endpoint: mockEndpoint });
    const result = await client.getEmbeddings(['one', 'two']);

    expect(result).toEqual([[0.1, 0.1], [0.2, 0.2]]);
  });

  it('throws error on non-ok response', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    const client = new EmbeddingClient({ endpoint: mockEndpoint });
    await expect(client.getEmbeddings('fail')).rejects.toThrow('Embedding API failed: Internal Server Error');
  });
});

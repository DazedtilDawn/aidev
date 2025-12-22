import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { httpServer } from '../src/server/index.js';
import fetch from 'node-fetch';

describe('Headless Server API', () => {
  const PORT = 3001;
  const BASE_URL = `http://localhost:${PORT}`;

  it('GET /api/health returns ok', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
  });

  it('GET /api/graph returns nodes and edges', async () => {
    const res = await fetch(`${BASE_URL}/api/graph`);
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(Array.isArray(data.nodes)).toBe(true);
    expect(Array.isArray(data.edges)).toBe(true);
    
    if (data.nodes.length > 0) {
      expect(data.nodes[0]).toHaveProperty('risk');
      expect(data.nodes[0]).toHaveProperty('fanIn');
    }
  });

  afterAll(() => {
    httpServer.close();
  });
});

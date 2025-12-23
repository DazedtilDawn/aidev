import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { loadProjectModel } from '../model/index.js';
import { ImpactAnalyzer } from '../impact/index.js';
import { normalizePath } from '../utils/index.js';
import { PromptPackGenerator, PresetResolver } from '../prompt/index.js';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ProjectWatcher } from './watcher.js';
import { EmbeddingClient } from '../embeddings/client.js';
import { VectorStore } from '../indexing/store.js';
import { ClaudeRunner } from '../runner/claude.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

// ... (broadcastLog and existing endpoints)

/**
 * POST /api/runner/run
 * Executes a prompt using the headless Claude CLI
 */
app.post('/api/runner/run', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    broadcastLog('Initializing Ghost Mode execution...', 'info');
    
    const runner = new ClaudeRunner();
    const result = await runner.execute(prompt);

    if (result.error) {
      broadcastLog(`Ghost Mode execution failed: ${result.error}`, 'error');
      return res.status(500).json({ error: result.error });
    }

    broadcastLog(`Ghost Mode execution complete. Cost: $${result.cost?.toFixed(4) || '0.0000'}`, 'success');
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    broadcastLog(`Runner system error: ${msg}`, 'error');
    res.status(500).json({ error: 'Failed to execute runner' });
  }
});

/**
 * POST /api/runner/apply
 * Applies a code change to the file system
 */
app.post('/api/runner/apply', async (req, res) => {
  try {
    const { path, content } = req.body;
    if (!path || content === undefined) {
      return res.status(400).json({ error: 'Path and content are required' });
    }

    const fullPath = join(process.cwd(), path);
    // TODO: Add safety check to ensure path is within project
    writeFileSync(fullPath, content, 'utf-8');
    
    broadcastLog(`Applied changes to ${path}`, 'success');
    res.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    broadcastLog(`Failed to apply changes: ${msg}`, 'error');
    res.status(500).json({ error: 'Failed to apply changes' });
  }
});

/**
 * GET /api/indexing/status
 * Returns current indexing status
 */
app.get('/api/indexing/status', async (req, res) => {
  const exists = existsSync(VECTOR_CACHE_PATH);
  let count = 0;
  if (exists) {
    const store = new VectorStore(VECTOR_CACHE_PATH);
    await store.load();
    try {
      const data = JSON.parse(readFileSync(VECTOR_CACHE_PATH, 'utf-8'));
      count = Object.keys(data).length;
    } catch (e) {}
  }
  res.json({ indexed: exists, fileCount: count });
});

/**
 * POST /api/indexing/run
 * Generates embeddings for all project files using local LM Studio
 */
app.post('/api/indexing/run', async (req, res) => {
  try {
    const projectPath = process.cwd();
    const model = await loadProjectModel(projectPath);
    const analyzer = new ImpactAnalyzer(model);
    
    const allEdges = analyzer.getMergedEdges();
    const filePaths = new Set<string>();
    for (const edge of allEdges) {
      filePaths.add(normalizePath(edge.source));
      filePaths.add(normalizePath(edge.target));
    }

    const files = Array.from(filePaths);
    const store = new VectorStore(VECTOR_CACHE_PATH);
    const client = new EmbeddingClient({ endpoint: LM_STUDIO_ENDPOINT });

    broadcastLog(`Starting semantic indexing of ${files.length} files...`, 'info');
    res.json({ message: 'Indexing started', totalFiles: files.length });

    // Run indexing in background
    (async () => {
      let completed = 0;
      for (const path of files) {
        try {
          const fullPath = join(projectPath, path);
          if (existsSync(fullPath)) {
            const content = readFileSync(fullPath, 'utf-8');
            const [embedding] = await client.getEmbeddings(content);
            await store.add(path, embedding);
          }
        } catch (error) {
          broadcastLog(`Failed to index ${path}`, 'error');
        }
        completed++;
        io.emit('indexing_progress', { 
          completed, 
          total: files.length, 
          current: path 
        });
      }
      await store.save();
      broadcastLog(`Indexing complete. ${files.length} vectors stored.`, 'success');
      io.emit('indexing_complete', { total: files.length });
    })();

  } catch (error) {
    broadcastLog('Failed to start indexing pipeline', 'error');
    res.status(500).json({ error: 'Failed to start indexing' });
  }
});

/**
 * POST /api/context/auto-select
 * Semantically retrieves relevant files based on user objective
 */
app.post('/api/context/auto-select', async (req, res) => {
  try {
    const { objective, topK = 5 } = req.body;
    if (!objective) {
      return res.status(400).json({ error: 'Objective is required' });
    }

    broadcastLog(`Running auto-pilot for objective: "${objective.slice(0, 30)}"...`, 'info');

    const store = new VectorStore(VECTOR_CACHE_PATH);
    await store.load();

    const client = new EmbeddingClient({ endpoint: LM_STUDIO_ENDPOINT });
    const [queryVector] = await client.getEmbeddings(objective);

    const matches = store.search(queryVector, topK);
    broadcastLog(`Auto-pilot matched ${matches.length} relevant context points.`, 'success');
    res.json({
      matches: matches.map(m => ({
        path: m.path,
        score: m.score
      }))
    });
  } catch (error) {
    broadcastLog('Auto-pilot semantic search failed', 'error');
    console.error('Auto-select failed:', error);
    res.status(500).json({ error: 'Failed to perform semantic search' });
  }
});

/**
 * GET /api/presets
 * Returns available prompt presets
 */
app.get('/api/presets', async (req, res) => {
  try {
    const resolver = new PresetResolver();
    const presets = await resolver.list();
    res.json(presets);
  } catch (error) {
    console.error('Failed to list presets:', error);
    res.status(500).json({ error: 'Failed to list presets' });
  }
});

/**
 * POST /api/tracks/sync
 * Creates or updates a Conductor track based on Edge Intel report
 */
app.post('/api/tracks/sync', async (req, res) => {
  try {
    const { tasks, objective } = req.body;
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Tasks are required' });
    }

    broadcastLog(`Promoting objective to track: ${objective}`, 'info');

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const safeTitle = objective.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    const trackId = `${safeTitle}_${dateStr}`;
    const trackDir = join(process.cwd(), 'conductor', 'tracks', trackId);

    if (!existsSync(trackDir)) {
      mkdirSync(trackDir, { recursive: true });
    }

    const planPath = join(trackDir, 'plan.md');
    const specPath = join(trackDir, 'spec.md');

    const planContent = `# Track Plan: ${objective}\n\n## Phase 1: Implementation\n` + 
      tasks.map(t => `- [ ] Task: ${t}`).join('\n') + '\n';
    
    const specContent = `# Specification: ${objective}\n\n## Objective\n${objective}\n\n## Scope\n- Strategic alignment with Edge Intel report.\n`;

    writeFileSync(planPath, planContent);
    writeFileSync(specPath, specContent);

    // Update tracks.md
    const tracksPath = join(process.cwd(), 'conductor', 'tracks.md');
    const tracksContent = readFileSync(tracksPath, 'utf-8');
    const newEntry = `\n## [ ] Track: ${objective}\n*Link: [./conductor/tracks/${trackId}/](./conductor/tracks/${trackId}/)*\n`;
    
    if (!tracksContent.includes(trackId)) {
      writeFileSync(tracksPath, tracksContent + newEntry);
    }

    broadcastLog(`Track ${trackId} scaffolded successfully.`, 'success');
    res.json({ success: true, trackId, path: `./conductor/tracks/${trackId}/` });
  } catch (error) {
    broadcastLog('Track promotion failed', 'error');
    res.status(500).json({ error: 'Failed to sync track' });
  }
});

/**
 * POST /api/prompt
 * Generates a formatted prompt based on file selection states
 */
app.post('/api/prompt', async (req, res) => {
  try {
    const { selections, task, provider = 'universal', preset: presetId } = req.body;
    
    broadcastLog(`Assembling context pack for task: "${task.slice(0, 30)}"...`, 'info');

    const projectPath = process.cwd();
    const model = await loadProjectModel(projectPath);
    const analyzer = new ImpactAnalyzer(model);
    
    const changedFiles = Object.entries(selections as Record<string, string>)
      .filter(([_, state]) => state === 'full')
      .map(([path, _]) => ({ path, changeType: 'modified' as const }));

    const report = analyzer.analyze(changedFiles);

    let preset;
    if (presetId) {
      const resolver = new PresetResolver();
      preset = await resolver.resolve(presetId);
    }

    const generator = new PromptPackGenerator({
      projectPath,
      provider: provider as any,
      budget: 100000,
      taskDescription: task,
      useSkeletons: true, 
      preset
    });

    const pack = await generator.generate(report);
    broadcastLog(`Context pack generated. Tokens: ${pack.manifest.tokens.total.toLocaleString()}`, 'success');
    res.json(pack);
  } catch (error) {
    broadcastLog('Prompt generation failed', 'error');
    console.error('Failed to generate prompt:', error);
    res.status(500).json({ error: 'Failed to generate prompt pack' });
  }
});

/**
 * GET /api/graph
 * Returns the full project model and dependency graph nodes/edges
 */
app.get('/api/graph', async (req, res) => {
  try {
    const projectPath = process.cwd();
    const model = await loadProjectModel(projectPath);
    const analyzer = new ImpactAnalyzer(model);
    
    const allEdges = analyzer.getMergedEdges();
    const nodes = new Set<string>();
    
    for (const edge of allEdges) {
      nodes.add(normalizePath(edge.source));
      nodes.add(normalizePath(edge.target));
    }

    const report = analyzer.analyze([]); 
    
    const nodeData = Array.from(nodes).map(path => {
      const metadata = report.fileMetadata?.[path] || { fanIn: 0, risk: 'low' };
      return {
        id: path,
        label: path.split('/').pop(),
        path,
        ...metadata
      };
    });

    res.json({
      nodes: nodeData,
      edges: allEdges.map(e => ({
        source: normalizePath(e.source),
        target: normalizePath(e.target),
        type: e.type,
        confidence: e.confidence
      }))
    });
  } catch (error) {
    console.error('Failed to load graph:', error);
    res.status(500).json({ error: 'Failed to load project graph' });
  }
});

httpServer.listen(PORT, () => {
  console.log(`🚀 AIDEV Headless Server running at http://localhost:${PORT}`);
});

export { app, httpServer, io };
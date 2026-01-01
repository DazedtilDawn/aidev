import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { loadProjectModel } from '../model/index.js';
import { ImpactAnalyzer } from '../impact/index.js';
import { normalizePath } from '../utils/index.js';
import { PromptPackGenerator, PresetResolver } from '../prompt/index.js';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { ProjectWatcher } from './watcher.js';
import { EmbeddingClient } from '../embeddings/client.js';
import { VectorStore, AnchorReranker } from '../indexing/index.js';
import { ClaudeRunner } from '../runner/claude.js';
import { ProjectManager } from './project-manager.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

const projectManager = new ProjectManager();
const PORT = process.env.PORT || 3001;
const getVectorCachePath = () => join(projectManager.getActivePath(), '.aidev', 'cache', 'vectors.json');
const LM_STUDIO_ENDPOINT = 'http://localhost:1234/v1/embeddings';

app.use(express.json());
app.use(cors());

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('!!! SERVER ERROR:', err);
  broadcastLog(`System Error: ${err.message}`, 'error');
  res.status(500).json({ error: err.message });
});

/**
 * Broadcasts a log message to all connected dashboard clients
 */
function broadcastLog(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  console.log(`[BROADCAST] [${type.toUpperCase()}] ${message}`);
  io.emit('system_log', {
    timestamp: new Date().toISOString(),
    message,
    type
  });
}

/**
 * GET /api/projects
 * List available projects
 */
app.get('/api/projects', (req, res) => {
  res.json({
    active: projectManager.getActivePath(),
    recent: projectManager.getRecentProjects()
  });
});

/**
 * POST /api/projects/active
 * Switch active project
 */
app.post('/api/projects/active', (req, res) => {
  const { path } = req.body;
  if (!path) return res.status(400).json({ error: 'Path is required' });
  
  if (projectManager.setActivePath(path)) {
    broadcastLog(`Switched active project to: ${path}`, 'success');
    io.emit('project_changed', { path });
    res.json({ success: true, active: path });
  } else {
    res.status(404).json({ error: 'Project path not found' });
  }
});

/**
 * POST /api/projects
 * Add a project to the registry
 */
app.post('/api/projects', (req, res) => {
  const { path } = req.body;
  if (!path) return res.status(400).json({ error: 'Path is required' });

  if (projectManager.addProject(path)) {
    res.json({ success: true, recent: projectManager.getRecentProjects() });
  } else {
    res.status(404).json({ error: 'Project path not found' });
  }
});

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

    const projectRoot = resolve(projectManager.getActivePath());
    const fullPath = resolve(join(projectRoot, path));

    // Safety check: ensure path is within project root (prevent path traversal)
    if (!fullPath.startsWith(projectRoot)) {
      return res.status(403).json({ error: 'Path traversal detected - access denied' });
    }

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
  const cachePath = getVectorCachePath();
  const exists = existsSync(cachePath);
  let count = 0;
  if (exists) {
    const store = new VectorStore(cachePath);
    await store.load();
    try {
      const data = JSON.parse(readFileSync(cachePath, 'utf-8'));
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
    const projectPath = projectManager.getActivePath();
    const model = await loadProjectModel(projectPath);
    const analyzer = new ImpactAnalyzer(model);
    
    const allEdges = analyzer.getMergedEdges();
    const filePaths = new Set<string>();
    for (const edge of allEdges) {
      filePaths.add(normalizePath(edge.source));
      filePaths.add(normalizePath(edge.target));
    }

    const files = Array.from(filePaths);
    const store = new VectorStore(getVectorCachePath());
    const client = new EmbeddingClient({
      endpoint: LM_STUDIO_ENDPOINT,
      model: 'text-embedding-bge-m3'
    });

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

    const store = new VectorStore(getVectorCachePath());
    await store.load();

    const client = new EmbeddingClient({ 
      endpoint: LM_STUDIO_ENDPOINT,
      model: 'text-embedding-bge-m3'
    });
    const [queryVector] = await client.getEmbeddings(objective);

    const matches = store.search(queryVector, topK);

    // 2. Structural Re-ranking
    const model = await loadProjectModel(projectManager.getActivePath());
    const reranker = new AnchorReranker(model);
    const rerankedMatches = reranker.rerank(matches);

    broadcastLog(`Auto-pilot matched ${rerankedMatches.length} relevant context points (reranked).`, 'success');
    res.json({
      matches: rerankedMatches.map(m => ({
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
    const projectPath = projectManager.getActivePath();
    const trackDir = join(projectPath, 'conductor', 'tracks', trackId);

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
    const tracksPath = join(projectPath, 'conductor', 'tracks.md');
    if (existsSync(tracksPath)) {
      const tracksContent = readFileSync(tracksPath, 'utf-8');
      const newEntry = `\n## [ ] Track: ${objective}\n*Link: [./conductor/tracks/${trackId}/](./conductor/tracks/${trackId}/)*\n`;
      
      if (!tracksContent.includes(trackId)) {
        writeFileSync(tracksPath, tracksContent + newEntry);
      }
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
    
    console.log(`[POST /api/prompt] Task: "${task?.slice(0, 50)}", Selections: ${Object.keys(selections || {}).length} files`);
    broadcastLog(`Assembling context pack for task: "${task?.slice(0, 30)}"...`, 'info');

    const projectPath = projectManager.getActivePath();
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
    const projectPath = projectManager.getActivePath();
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
      
      // Add rough token estimation (chars / 4) for UI feedback
      let tokens = 0;
      const fullPath = join(projectPath, path);
      if (existsSync(fullPath)) {
        const stats = readFileSync(fullPath, 'utf-8');
        tokens = Math.ceil(stats.length / 4);
      }

      return {
        id: path,
        label: path.split('/').pop(),
        path,
        tokens,
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
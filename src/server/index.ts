import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { loadProjectModel } from '../model/index.js';
import { ImpactAnalyzer } from '../impact/index.js';
import { normalizePath } from '../utils/index.js';
import { PromptPackGenerator } from '../prompt/index.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ProjectWatcher } from './watcher.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Start watcher
const watcher = new ProjectWatcher(process.cwd(), io);
watcher.start();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/prompt
 * Generates a formatted prompt based on file selection states
 */
app.post('/api/prompt', async (req, res) => {
  try {
    const { selections, task, provider = 'universal' } = req.body;
    // selections: Record<string, 'full' | 'skeleton' | 'exclude'>

    const projectPath = process.cwd();
    const model = await loadProjectModel(projectPath);
    const analyzer = new ImpactAnalyzer(model);
    
    // We mock a report based on selections
    const changedFiles = Object.entries(selections as Record<string, string>)
      .filter(([_, state]) => state === 'full')
      .map(([path, _]) => ({ path, changeType: 'modified' as const }));

    const report = analyzer.analyze(changedFiles);

    const generator = new PromptPackGenerator({
      projectPath,
      provider: provider as any,
      budget: 100000,
      taskDescription: task,
      useSkeletons: true // The generator logic uses this, but we'll override content manually if needed
    });

    const pack = await generator.generate(report);
    res.json(pack);
  } catch (error) {
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
    
    // Get all files from the model
    // In our project, "all files" are those involved in edges or defined in components
    const allEdges = analyzer.getMergedEdges();
    const nodes = new Set<string>();
    
    for (const edge of allEdges) {
      nodes.add(normalizePath(edge.source));
      nodes.add(normalizePath(edge.target));
    }

    // Prepare node metadata (fanIn, risk)
    const report = analyzer.analyze([]); // Empty changes just to get full metadata calc
    
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

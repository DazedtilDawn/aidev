import { useState, useEffect, useMemo, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  type Node, 
  ConnectionLineType,
  MarkerType,
  Handle,
  Position,
  type NodeProps,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { 
  Activity, 
  Shield, 
  Terminal, 
  Zap, 
  Layers, 
  Box, 
  Search,
  Maximize2,
  Filter
} from 'lucide-react';
import { io } from 'socket.io-client';
import * as d3 from 'd3-force';

const API_BASE = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

/**
 * Bespoke Node Component for Semantic Skeletons
 */
const CustomNode = ({ data, selected }: NodeProps) => {
  const isHighRisk = data.risk === 'high';
  const isMediumRisk = data.risk === 'medium';
  
  const statusColor = isHighRisk 
    ? 'border-red-500/50 bg-red-500/10 text-red-400' 
    : (isMediumRisk ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-zinc-800 bg-zinc-900/50 text-zinc-400');

  const selectionBorder = selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-black' : '';

  return (
    <div className={`px-4 py-3 rounded-lg border backdrop-blur-md transition-all duration-300 ${statusColor} ${selectionBorder} group hover:border-accent/50 min-w-[160px]`}>
      <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] tracking-widest uppercase opacity-50">
            {data.risk} Risk
          </span>
          {isHighRisk && <Shield size={12} className="text-red-500 animate-pulse" />}
        </div>
        <div className="text-sm font-semibold truncate leading-none mt-1">
          {data.label}
        </div>
        <div className="flex items-center gap-2 mt-2 border-t border-white/5 pt-2">
          <span className="text-[9px] opacity-40">FAN-IN: {data.fanIn}</span>
          <span className="text-[9px] opacity-20 ml-auto truncate max-w-[80px]">{data.dir}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const App = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selections, setSelections] = useState<Record<string, 'full' | 'skeleton' | 'exclude'>>({});
  const [task, setTask] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchGraph = async () => {
    try {
      const response = await axios.get(`${API_BASE}/graph`);
      const { nodes: nodeData, edges: edgeData } = response.data;

      // Extract directories for clustering
      const dirs: string[] = Array.from(new Set(nodeData.map((n: any) => n.path.split('/').slice(0, -1).join('/'))));
      const dirCenters: Record<string, { x: number, y: number }> = dirs.reduce((acc, dir, i) => {
        const angle = (i / dirs.length) * 2 * Math.PI;
        return {
          ...acc,
          [dir]: { x: Math.cos(angle) * 400, y: Math.sin(angle) * 400 }
        };
      }, {} as Record<string, { x: number, y: number }>);

      // Initial positions for D3 simulation
      const simulationNodes = nodeData.map((n: any) => {
        const dir = n.path.split('/').slice(0, -1).join('/');
        return {
          id: n.id,
          x: (dirCenters[dir]?.x || 0) + (Math.random() - 0.5) * 100,
          y: (dirCenters[dir]?.y || 0) + (Math.random() - 0.5) * 100,
          data: { ...n, dir }
        };
      });

      const simulationLinks = edgeData.map((e: any) => ({
        source: e.source,
        target: e.target
      }));

      // Run D3 Simulation
      const simulation = d3.forceSimulation(simulationNodes as any)
        .force('link', d3.forceLink(simulationLinks).id((d: any) => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('x', d3.forceX().x((d: any) => dirCenters[d.data.dir]?.x || 0).strength(0.1))
        .force('y', d3.forceY().y((d: any) => dirCenters[d.data.dir]?.y || 0).strength(0.1))
        .force('center', d3.forceCenter(0, 0))
        .force('collision', d3.forceCollide().radius(100))
        .stop();

      // Run simulation to stability
      for (let i = 0; i < 300; ++i) simulation.tick();

      const formattedNodes = simulationNodes.map((n: any) => ({
        id: n.id,
        type: 'custom',
        data: n.data,
        position: { x: n.x + 600, y: n.y + 400 },
      }));

      const formattedEdges = edgeData.map((e: any, i: number) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        animated: true,
        type: ConnectionLineType.SmoothStep,
        style: { stroke: '#27272a', strokeWidth: 1 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#27272a' },
      }));

      setNodes(formattedNodes as any);
      setEdges(formattedEdges as any);
      
      setSelections(prev => {
        const next = { ...prev };
        nodeData.forEach((n: any) => {
          if (!next[n.id]) next[n.id] = 'exclude';
        });
        return next;
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching graph:', error);
    }
  };

  useEffect(() => {
    fetchGraph();
    const socket = io(SOCKET_URL);
    socket.on('graph_update', fetchGraph);
    return () => { socket.disconnect(); };
  }, []);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelections(prev => {
      const current = prev[node.id];
      const next = current === 'exclude' ? 'full' : (current === 'full' ? 'skeleton' : 'exclude');
      return { ...prev, [node.id]: next };
    });
  }, []);

  const generatePrompt = async () => {
    try {
      const response = await axios.post(`${API_BASE}/prompt`, { 
        selections, 
        task,
        provider: 'universal'
      });
      console.log('--- GENERATED PACK ---');
      console.log(response.data.content);
      alert('Context Packet copied to console (check DevTools)');
    } catch (error) {
      alert('Generation failed');
    }
  };

  const filteredNodes = useMemo(() => {
    if (!search) return nodes;
    return nodes.map(n => ({
      ...n,
      hidden: !n.data.label.toLowerCase().includes(search.toLowerCase()) && 
              !n.data.path.toLowerCase().includes(search.toLowerCase())
    }));
  }, [nodes, search]);

  const activeSelections = useMemo(() => 
    Object.entries(selections).filter(([_, state]) => state !== 'exclude'),
    [selections]
  );

  return (
    <div className="flex h-screen w-screen bg-[#050505] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar: Orchestration Panel */}
      <aside className="w-[420px] border-r border-zinc-800/50 bg-[#080808] flex flex-col z-10 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-zinc-800/30 bg-black/20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Activity className="text-accent" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Mission Control</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">AIDEV context orchestrator</p>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-accent transition-colors" size={14} />
            <input 
              type="text"
              placeholder="Filter nodes by name or path..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:border-accent/50 transition-all placeholder:text-zinc-700"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <section className="space-y-3">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter flex items-center gap-2">
              <Terminal size={12} /> Strategic Brief
            </label>
            <textarea 
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Define current development cycle..."
              className="w-full h-32 bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-zinc-700 resize-none font-mono leading-relaxed"
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter flex items-center gap-2">
                <Layers size={12} /> Context Mixer
              </label>
              <div className="flex items-center gap-2">
                <Filter size={10} className="text-zinc-600" />
                <span className="text-[10px] font-mono text-accent">{activeSelections.length} active</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {activeSelections.map(([path, state]) => (
                <div key={path} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg group animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium truncate max-w-[180px]">{path.split('/').pop()}</span>
                    <span className="text-[9px] text-zinc-600 truncate">{path}</span>
                  </div>
                  <div className={`px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest ${state === 'full' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                    {state}
                  </div>
                </div>
              ))}
              {activeSelections.length === 0 && (
                <div className="py-12 border-2 border-dashed border-zinc-900 rounded-xl flex flex-col items-center justify-center text-zinc-700 gap-2">
                  <Box size={24} className="opacity-20" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-center px-8">Select nodes on the map to mix context</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="p-8 border-t border-zinc-800/30 bg-black/20">
          <button 
            onClick={generatePrompt}
            disabled={activeSelections.length === 0}
            className="group relative w-full py-4 bg-zinc-100 text-black rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-all hover:bg-white active:scale-[0.98] disabled:opacity-20 disabled:grayscale overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.05)]"
          >
            <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-10" />
            Assemble Edge Pack
          </button>
        </div>
      </aside>

      {/* Primary Visual Surface */}
      <main className="flex-1 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-background to-background">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Zap className="text-accent animate-pulse" size={32} />
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500">Calculating Repository Lattice</span>
            </div>
          </div>
        ) : (
          <ReactFlow 
            nodes={filteredNodes} 
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            className="selection-none"
          >
            <Background color="#18181b" gap={20} size={1} />
            <Controls className="!bg-zinc-900 !border-zinc-800 !fill-zinc-100" />
          </ReactFlow>
        )}
        
        {/* HUD Elements */}
        <div className="absolute top-8 left-8 flex gap-4 pointer-events-none">
          <div className="px-4 py-2 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-full flex items-center gap-3 shadow-2xl">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Lattice Active</span>
          </div>
        </div>

        <div className="absolute top-8 right-8 flex gap-2">
           <button onClick={() => fetchGraph()} className="p-3 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-xl hover:border-accent/50 transition-all text-zinc-400 hover:text-white">
             <Maximize2 size={16} />
           </button>
        </div>

        {/* Floating Legend */}
        <div className="absolute bottom-8 left-8 p-6 bg-zinc-900/40 backdrop-blur-2xl border border-zinc-800/50 rounded-2xl shadow-2xl max-w-[280px]">
          <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Layers size={12} /> Visual Heuristics
          </h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 group">
              <div className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded-sm" />
              <span className="text-[10px] text-zinc-300">High Risk (Fan-In/Impact)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-amber-500/20 border border-amber-500/50 rounded-sm" />
              <span className="text-[10px] text-zinc-300">Modular Bridge Node</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-zinc-800 border border-zinc-700 rounded-sm" />
              <span className="text-[10px] text-zinc-300">Isolated Implementation</span>
            </div>
            <div className="pt-4 mt-4 border-t border-zinc-800/50">
              <p className="text-[9px] leading-relaxed text-zinc-500 italic font-serif">
                Physics layout groups files by directory depth. Toggle states via node interaction.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
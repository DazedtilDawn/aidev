import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge,
  ConnectionLineType,
  MarkerType,
  Handle,
  Position,
  NodeProps
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { Activity, Shield, Terminal, Zap, Layers, Box } from 'lucide-react';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

/**
 * Bespoke Node Component for Semantic Skeletons
 */
const CustomNode = ({ data, id }: NodeProps) => {
  const isHighRisk = data.risk === 'high';
  const isMediumRisk = data.risk === 'medium';
  
  const statusColor = isHighRisk 
    ? 'border-red-500/50 bg-red-500/10 text-red-400' 
    : (isMediumRisk ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-zinc-800 bg-zinc-900/50 text-zinc-400');

  return (
    <div className={`px-4 py-3 rounded-lg border backdrop-blur-md transition-all duration-300 ${statusColor} group hover:border-accent/50 min-w-[160px]`}>
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
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selections, setSelections] = useState<Record<string, 'full' | 'skeleton' | 'exclude'>>({});
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchGraph = async () => {
    try {
      const response = await axios.get(`${API_BASE}/graph`);
      const { nodes: nodeData, edges: edgeData } = response.data;

      const formattedNodes = nodeData.map((n: any, i: number) => ({
        id: n.id,
        type: 'custom',
        data: { label: n.label, risk: n.risk, fanIn: n.fanIn },
        position: { x: Math.cos(i) * 500 + 600, y: Math.sin(i) * 500 + 400 },
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

      setNodes(formattedNodes);
      setEdges(formattedEdges);
      
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

  const onNodeClick = (_: any, node: Node) => {
    setSelections(prev => {
      const current = prev[node.id];
      const next = current === 'exclude' ? 'full' : (current === 'full' ? 'skeleton' : 'exclude');
      return { ...prev, [node.id]: next };
    });
  };

  const generatePrompt = async () => {
    try {
      const response = await axios.post(`${API_BASE}/prompt`, { selections, task });
      console.log('--- GENERATED PACK ---');
      console.log(response.data.content);
      alert('Context Packet copied to console (check DevTools)');
    } catch (error) {
      alert('Generation failed');
    }
  };

  const activeSelections = useMemo(() => 
    Object.entries(selections).filter(([_, state]) => state !== 'exclude'),
    [selections]
  );

  return (
    <div className="flex h-screen w-screen bg-[#050505] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar: Orchestration Panel */}
      <aside className="w-[400px] border-r border-zinc-800/50 bg-[#080808] flex flex-col p-8 z-10 shadow-2xl">
        <div className="flex items-center gap-3 mb-12">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Activity className="text-accent" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Mission Control</h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">AIDEV context orchestrator</p>
          </div>
        </div>

        <section className="space-y-8 flex-1">
          <div className="space-y-3">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter flex items-center gap-2">
              <Terminal size={12} /> Objective
            </label>
            <textarea 
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Define current development cycle..."
              className="w-full h-32 bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-zinc-700 resize-none font-mono"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter flex items-center gap-2">
                <Layers size={12} /> Active Context Mixer
              </label>
              <span className="text-[10px] font-mono text-accent">{activeSelections.length} files</span>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
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
                  <span className="text-[10px] font-mono uppercase tracking-widest">Graph Interaction Required</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <button 
          onClick={generatePrompt}
          disabled={activeSelections.length === 0}
          className="mt-8 group relative w-full py-4 bg-zinc-100 text-black rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-all hover:bg-white active:scale-[0.98] disabled:opacity-20 disabled:grayscale overflow-hidden"
        >
          <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-10" />
          Assemble Context Pack
        </button>
      </aside>

      {/* Primary Visual Surface */}
      <main className="flex-1 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-background to-background">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Zap className="text-accent animate-pulse" size={32} />
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500">Mapping Repository Topology</span>
            </div>
          </div>
        ) : (
          <ReactFlow 
            nodes={nodes} 
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            className="selection-none"
          >
            <Background color="#18181b" gap={20} size={1} />
            <Controls className="!bg-zinc-900 !border-zinc-800 !fill-zinc-100" />
          </ReactFlow>
        )}
        
        {/* Status HUD */}
        <div className="absolute top-8 right-8 flex gap-4 pointer-events-none">
          <div className="px-4 py-2 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-full flex items-center gap-3 shadow-2xl">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">System Live</span>
          </div>
        </div>

        {/* Floating Legend */}
        <div className="absolute bottom-8 right-8 p-6 bg-zinc-900/40 backdrop-blur-2xl border border-zinc-800/50 rounded-2xl shadow-2xl max-w-[240px]">
          <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] mb-4">Topology Key</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded-sm" />
              <span className="text-[10px] text-zinc-300">High Impact / Fan-In {'>'} 5</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-amber-500/20 border border-amber-500/50 rounded-sm" />
              <span className="text-[10px] text-zinc-300">Modular Dependency</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-zinc-800 border border-zinc-700 rounded-sm" />
              <span className="text-[10px] text-zinc-300">Isolated Logic</span>
            </div>
            <div className="pt-4 mt-4 border-t border-zinc-800/50">
              <p className="text-[9px] leading-relaxed text-zinc-500 italic font-serif">
                Tap nodes to cycle: Exclude &rarr; Full Logic &rarr; Semantic Skeleton
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
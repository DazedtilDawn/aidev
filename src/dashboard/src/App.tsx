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
  Filter,
  X,
  Copy,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Share2
} from 'lucide-react';
import { io } from 'socket.io-client';
import { 
  forceSimulation, 
  forceLink, 
  forceManyBody, 
  forceX, 
  forceY, 
  forceCenter, 
  forceCollide 
} from 'd3-force';

const API_BASE = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

/**
 * Bespoke Node Component
 */
const CustomNode = ({ data, selected }: NodeProps) => {
  const isHighRisk = data.risk === 'high';
  const isMediumRisk = data.risk === 'medium';
  
  const statusColor = isHighRisk 
    ? 'border-red-500/50 bg-red-500/10 text-red-400' 
    : (isMediumRisk ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-zinc-800 bg-zinc-900/50 text-zinc-400');

  const selectionBorder = selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-black shadow-[0_0_20px_rgba(59,130,246,0.3)]' : '';

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

/**
 * Toast Component
 */
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : (type === 'error' ? 'bg-red-500/10 border-red-500/20' : 'bg-accent/10 border-accent/20');
  const Icon = type === 'success' ? CheckCircle2 : (type === 'error' ? AlertCircle : Activity);
  const iconColor = type === 'success' ? 'text-emerald-400' : (type === 'error' ? 'text-red-400' : 'text-accent');

  return (
    <div className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl animate-in slide-in-from-right-4 duration-300 ${bgColor}`}>
      <Icon size={18} className={iconColor} />
      <span className="text-xs font-medium text-zinc-200">{message}</span>
      <button onClick={onClose} className="ml-4 p-1 hover:bg-white/5 rounded-md transition-colors">
        <X size={14} className="text-zinc-500" />
      </button>
    </div>
  );
};

/**
 * Prompt Preview Modal
 */
const PromptPreviewModal = ({ content, onClose }: { content: string, onClose: () => void }) => {
  const [copied, setSelected] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setSelected(true);
    setTimeout(() => setSelected(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-5xl max-h-[85vh] bg-[#0a0a0a] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Share2 size={18} className="text-accent" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Generated Context Pack</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
            >
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy to Clipboard'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <X size={20} className="text-zinc-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-black">
          <pre className="font-mono text-xs text-emerald-500/90 leading-relaxed whitespace-pre-wrap">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
};

/**
 * Context Menu Component
 */
const ContextMenu = ({ x, y, onSelectNeighbors, onClose }: { x: number, y: number, onSelectNeighbors: () => void, onClose: () => void }) => {
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div 
      style={{ top: y, left: x }} 
      className="fixed z-[100] bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
    >
      <button 
        onClick={(e) => { e.stopPropagation(); onSelectNeighbors(); onClose(); }}
        className="w-full px-4 py-2 text-left text-[10px] font-mono uppercase tracking-widest text-zinc-300 hover:bg-zinc-900 hover:text-accent transition-colors flex items-center gap-2"
      >
        <Share2 size={12} /> Select Neighbors
      </button>
    </div>
  );
};

const App = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selections, setSelections] = useState<Record<string, 'full' | 'skeleton' | 'exclude'>>({});
  const [task, setTask] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [presets, setPresets] = useState<Array<{ id: string, title: string }>>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('edge-analyst');
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState({ completed: 0, total: 0, current: '' });
  const [isIndexed, setIsIndexed] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message, type });

  const fetchPresets = async () => {
    try {
      const response = await axios.get(`${API_BASE}/presets`);
      setPresets(response.data);
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    }
  };

  const fetchIndexingStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/indexing/status`);
      setIsIndexed(response.data.indexed);
    } catch (error) {
      console.error('Failed to fetch indexing status:', error);
    }
  };

  const handleStartIndexing = async () => {
    setIsIndexing(true);
    showToast('Initializing local embedding pipeline...', 'info');
    try {
      await axios.post(`${API_BASE}/indexing/run`);
    } catch (error) {
      showToast('Indexing failed. Is LM Studio running?', 'error');
      setIsIndexing(false);
    }
  };

  const handleAutoSelect = async () => {
    if (!task) return;
    try {
      const response = await axios.post(`${API_BASE}/context/auto-select`, { objective: task });
      const matches = response.data.matches as Array<{ path: string }>;
      
      setSelections(prev => {
        const next = { ...prev };
        matches.forEach(m => {
          next[m.path] = 'full';
        });
        return next;
      });
      showToast(`Selected ${matches.length} relevant files.`, 'success');
    } catch (error) {
      showToast('Semantic search failed.', 'error');
    }
  };

  const handleSelectNeighbors = () => {
    if (!contextMenu) return;
    const { nodeId } = contextMenu;
    
    setSelections(prev => {
      const next = { ...prev };
      next[nodeId] = 'full';
      edges.forEach(e => {
        if (e.source === nodeId) next[e.target] = 'skeleton';
        if (e.target === nodeId) next[e.source] = 'skeleton'; 
      });
      return next;
    });
    showToast('Cluster selected (Source + Neighbors).', 'success');
  };

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  const fetchGraph = async () => {
    try {
      const response = await axios.get(`${API_BASE}/graph`);
      const { nodes: nodeData, edges: edgeData } = response.data;

      if (!nodeData || nodeData.length === 0) {
        setLoading(false);
        return;
      }

      const dirs: string[] = Array.from(new Set(nodeData.map((n: any) => n.path.split('/').slice(0, -1).join('/'))));
      const dirCenters: Record<string, { x: number, y: number }> = dirs.reduce((acc, dir, i) => {
        const angle = (i / dirs.length) * 2 * Math.PI;
        return { ...acc, [dir]: { x: Math.cos(angle) * 400, y: Math.sin(angle) * 400 } };
      }, {} as Record<string, { x: number, y: number }>);

      const simulationNodes = nodeData.map((n: any) => {
        const dir = n.path.split('/').slice(0, -1).join('/');
        return {
          id: n.id,
          x: (dirCenters[dir]?.x || 0) + (Math.random() - 0.5) * 100,
          y: (dirCenters[dir]?.y || 0) + (Math.random() - 0.5) * 100,
          data: { ...n, dir }
        };
      });

      const simulationLinks = edgeData.map((e: any) => ({ source: e.source, target: e.target }));

      const simulation = forceSimulation(simulationNodes as any)
        .force('link', forceLink(simulationLinks).id((d: any) => d.id).distance(150))
        .force('charge', forceManyBody().strength(-300))
        .force('x', forceX().x((d: any) => dirCenters[d.data.dir]?.x || 0).strength(0.1))
        .force('y', forceY().y((d: any) => dirCenters[d.data.dir]?.y || 0).strength(0.1))
        .force('center', forceCenter(0, 0))
        .force('collision', forceCollide().radius(100))
        .stop();

      for (let i = 0; i < 300; ++i) simulation.tick();

      const formattedNodes = simulationNodes.map((n: any) => ({
        id: n.id,
        type: 'custom',
        data: n.data,
        position: { x: n.x || 0 + 600, y: n.y || 0 + 400 },
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
        nodeData.forEach((n: any) => { if (!next[n.id]) next[n.id] = 'exclude'; });
        return next;
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching graph:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
    fetchPresets();
    fetchIndexingStatus();
    
    const socket = io(SOCKET_URL);
    socket.on('graph_update', fetchGraph);
    
    socket.on('indexing_progress', (data) => {
      setIsIndexing(true);
      setIndexingProgress(data);
    });

    socket.on('indexing_complete', () => {
      setIsIndexing(false);
      setIsIndexed(true);
      showToast('Indexing complete. Auto-pilot active.', 'success');
      setIndexingProgress({ completed: 0, total: 0, current: '' });
    });

    return () => { socket.disconnect(); };
  }, []);

  const onNodeMouseEnter = (_: any, node: Node) => setHoveredNode(node.id);
  const onNodeMouseLeave = () => setHoveredNode(null);

  const highlightedEdges = useMemo(() => {
    if (!hoveredNode) return edges;
    return edges.map(e => ({
      ...e,
      style: { 
        ...e.style, 
        stroke: (e.source === hoveredNode || e.target === hoveredNode) ? '#3b82f6' : '#18181b',
        strokeWidth: (e.source === hoveredNode || e.target === hoveredNode) ? 2 : 1,
        opacity: (e.source === hoveredNode || e.target === hoveredNode) ? 1 : 0.1
      },
      animated: (e.source === hoveredNode || e.target === hoveredNode)
    }));
  }, [edges, hoveredNode]);

  const filteredNodes = useMemo(() => {
    if (!search) return nodes;
    return nodes.map(n => ({
      ...n,
      hidden: !n.data.label.toLowerCase().includes(search.toLowerCase()) && 
              !n.data.path.toLowerCase().includes(search.toLowerCase())
    }));
  }, [nodes, search]);

  const highlightedNodes = useMemo(() => {
    const neighborIds = new Set<string>();
    if (hoveredNode) {
      edges.forEach(e => {
        if (e.source === hoveredNode) neighborIds.add(e.target);
        if (e.target === hoveredNode) neighborIds.add(e.source);
      });
      neighborIds.add(hoveredNode);
    }

    return filteredNodes.map(n => ({
      ...n,
      style: {
        ...n.style,
        opacity: hoveredNode ? (neighborIds.has(n.id) ? 1 : 0.2) : 1,
        transition: 'opacity 0.2s ease-in-out'
      }
    }));
  }, [filteredNodes, edges, hoveredNode]);

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
        provider: 'universal',
        preset: selectedPreset
      });
      setPreviewContent(response.data.content);
      showToast('Context Pack assembled successfully.', 'success');
    } catch (error) {
      showToast('Generation failed.', 'error');
    }
  };

  const handleClearMixer = () => {
    setSelections(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => next[k] = 'exclude');
      return next;
    });
    showToast('Context mixer cleared.', 'info');
  };

  const activeSelections = useMemo(() => 
    Object.entries(selections).filter(([_, state]) => state !== 'exclude'),
    [selections]
  );

  return (
    <div className="flex h-screen w-screen bg-[#050505] text-zinc-100 overflow-hidden font-sans selection:bg-accent/30">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {previewContent && <PromptPreviewModal content={previewContent} onClose={() => setPreviewContent(null)} />}
      
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          onSelectNeighbors={handleSelectNeighbors} 
          onClose={() => setContextMenu(null)} 
        />
      )}

      {/* Sidebar: Orchestration Panel */}
      <aside className="w-[420px] border-r border-zinc-800/50 bg-[#080808] flex flex-col z-10 shadow-2xl overflow-hidden backdrop-blur-2xl">
        <div className="p-8 border-b border-zinc-800/30 bg-black/20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20">
              <Activity className="text-accent" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">Mission Control</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em]">Edge Context Engine</p>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-accent transition-colors" size={14} />
            <input 
              type="text"
              placeholder="Search lattice nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:border-accent/50 transition-all placeholder:text-zinc-700"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.1em] flex items-center gap-2">
                <Terminal size={14} className="text-accent" /> Strategic Brief
              </label>
              
              <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-accent/50 transition-colors relative z-20">
                <Zap size={12} className="text-accent" />
                <select 
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="bg-transparent text-[10px] font-mono uppercase tracking-widest text-zinc-300 focus:outline-none cursor-pointer w-full appearance-none pr-4"
                >
                  <option value="" className="bg-zinc-900 text-zinc-300">Standard Pack</option>
                  {presets.map(p => (
                    <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-300">{p.title}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              <textarea 
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe objective for auto-pilot..."
                className="w-full h-36 bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 text-sm focus:outline-none focus:border-accent/50 transition-all placeholder:text-zinc-700 resize-none font-mono leading-relaxed"
              />
              <button
                onClick={handleAutoSelect}
                disabled={!task || isIndexing}
                className="absolute bottom-4 right-4 bg-accent text-white p-2.5 rounded-xl hover:bg-accent/80 transition-all shadow-xl disabled:opacity-20 disabled:scale-95 active:scale-90 group"
                title="Semantic Auto-Select (Uses Local AI)"
              >
                <Maximize2 size={16} className="group-hover:rotate-12 transition-transform" />
              </button>
            </div>

            {isIndexing && (
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest">Indexing Lattice</span>
                  <span className="text-[10px] font-mono text-zinc-500">{indexingProgress.completed} / {indexingProgress.total}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                    style={{ width: indexingProgress.total > 0 ? `${(indexingProgress.completed / indexingProgress.total) * 100}%` : '0%' }}
                  />
                </div>
                <p className="text-[9px] text-zinc-600 mt-3 truncate font-mono italic">{indexingProgress.current}</p>
              </div>
            )}

            {!isIndexing && !isIndexed && (
              <button 
                onClick={handleStartIndexing}
                className="w-full py-3 border border-dashed border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:border-accent/30 hover:text-accent transition-all bg-zinc-900/10"
              >
                Build Semantic Index (LM Studio)
              </button>
            )}

            {!isIndexing && isIndexed && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Semantic Index Ready</span>
                </div>
                <button 
                  onClick={handleStartIndexing}
                  className="text-[9px] font-bold text-zinc-500 hover:text-accent uppercase tracking-widest underline underline-offset-4 decoration-zinc-800"
                >
                  Refresh
                </button>
              </div>
            )}
          </section>

          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.1em] flex items-center gap-2">
                <Layers size={14} className="text-accent" /> Context Mixer
              </label>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-accent">{activeSelections.length} active</span>
                {activeSelections.length > 0 && (
                  <button onClick={handleClearMixer} className="p-1 hover:bg-red-500/10 rounded-md transition-colors text-zinc-600 hover:text-red-400" title="Clear All">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {activeSelections.map(([path, state]) => (
                <div key={path} className="flex items-center justify-between p-3.5 bg-zinc-900/40 border border-zinc-800/50 rounded-xl group animate-in fade-in slide-in-from-left-2 duration-300 hover:border-zinc-700 transition-colors">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate text-zinc-200">{path.split('/').pop()}</span>
                    <span className="text-[10px] text-zinc-600 truncate font-mono">{path}</span>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${state === 'full' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                    {state}
                  </div>
                </div>
              ))}
              {activeSelections.length === 0 && (
                <div className="py-16 border-2 border-dashed border-zinc-900 rounded-2xl flex flex-col items-center justify-center text-zinc-700 gap-3">
                  <Box size={32} className="opacity-10" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-center px-12 leading-relaxed">
                    Select nodes from the lattice to orchestrate context
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="p-8 border-t border-zinc-800/30 bg-black/40">
          <button 
            onClick={generatePrompt}
            disabled={activeSelections.length === 0}
            className="group relative w-full py-4.5 bg-zinc-100 text-black rounded-xl font-black text-[11px] uppercase tracking-[0.25em] transition-all hover:bg-white active:scale-[0.98] disabled:opacity-20 disabled:grayscale overflow-hidden shadow-2xl flex items-center justify-center gap-2"
          >
            <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-10" />
            Assemble Edge Pack
          </button>
        </div>
      </aside>

      {/* Primary Visual Surface */}
      <main className="flex-1 relative bg-[#050505]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent pointer-events-none" />
        
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <Zap className="text-accent animate-pulse" size={48} />
                <div className="absolute inset-0 blur-2xl bg-accent/20 animate-pulse" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500 animate-pulse">Resolving Codebase Topology</span>
            </div>
          </div>
        ) : (
          <ReactFlow 
            nodes={highlightedNodes} 
            edges={highlightedEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onNodeContextMenu={onNodeContextMenu}
            fitView
            className="selection-none"
          >
            <Background color="#111" gap={24} size={1} />
            <Controls className="!bg-zinc-900 !border-zinc-800 !fill-zinc-100 !rounded-xl !overflow-hidden !shadow-2xl" />
          </ReactFlow>
        )}
        
        {/* HUD Elements */}
        <div className="absolute top-8 left-8 flex gap-4 pointer-events-none">
          <div className="px-5 py-2.5 bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800 rounded-2xl flex items-center gap-3 shadow-2xl">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Lattice Live</span>
          </div>
        </div>

        <div className="absolute top-8 right-8 flex gap-3">
           <button 
            onClick={() => fetchGraph()} 
            className="p-3 bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800 rounded-xl hover:border-accent/50 transition-all text-zinc-400 hover:text-white shadow-2xl"
            title="Recalculate Layout"
           >
             <Maximize2 size={18} />
           </button>
        </div>

        {/* Floating Legend */}
        <div className="absolute bottom-8 left-8 p-7 bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800/50 rounded-3xl shadow-2xl max-w-[320px]">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em] mb-5 flex items-center gap-2">
            <Filter size={14} className="text-accent" /> Heuristics
          </h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4 group">
              <div className="w-3.5 h-3.5 bg-red-500/20 border border-red-500/50 rounded-md shadow-[0_0_10px_rgba(239,68,68,0.2)]" />
              <span className="text-[11px] font-bold text-zinc-300">High Risk Factor</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-3.5 h-3.5 bg-amber-500/20 border border-amber-500/50 rounded-md shadow-[0_0_10px_rgba(245,158,11,0.2)]" />
              <span className="text-[11px] font-bold text-zinc-300">Modular Bridge</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-3.5 h-3.5 bg-zinc-800 border border-zinc-700 rounded-md" />
              <span className="text-[11px] font-bold text-zinc-300">Isolated Implementation</span>
            </div>
            <div className="pt-5 mt-5 border-t border-zinc-800/50">
              <p className="text-[10px] leading-relaxed text-zinc-500 italic font-serif opacity-80">
                Force-directed positioning clusters files by directory depth. Toggle states via node interaction.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
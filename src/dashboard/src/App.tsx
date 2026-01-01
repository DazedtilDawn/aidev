import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Terminal,
  Zap,
  ChevronDown,
  CheckCircle2,
  FolderOpen,
  Plus,
  Loader2, // Used in IntentTerminal
  Sparkles, // Used in IntentTerminal
  Share2, // Used in ContextPreview
  Copy, // Used in ContextPreview
  AlertCircle, // Unused in App.tsx JSX
  Trash2, // Used in Context Mixer
  Maximize2, // Used in HUD elements
  Filter, // Used in Floating Legend
  X, // Used in Modals
  Shield, // Used in EdgeReportPanel
} from 'lucide-react';
import { io } from 'socket.io-client';

// New Context Forge Components
import { IntentTerminal } from './components/forge/IntentTerminal';
import { AnchorDiscovery } from './components/forge/AnchorDiscovery';
import { LatticeCurator } from './components/forge/LatticeCurator';
import type { FidelityLevel } from './components/forge/LatticeCurator';
import { ContextPreview } from './components/forge/ContextPreview';
import { ProjectSwitcher } from './components/forge/ProjectSwitcher';
import { AdvisoryCouncil } from './components/forge/AdvisoryCouncil';

const API_BASE = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

/**
 * Toast Component
 */
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : (type === 'error' ? 'bg-red-500/10 border-red-500/20' : 'bg-accent/10 border-accent/20');

  return (
    <div className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl animate-in slide-in-from-right-4 duration-300 ${bgColor}`}>
      <span className="text-xs font-medium text-zinc-200">{message}</span>
    </div>
  );
};

/**
 * Terminal Panel Component (Legacy Pulse)
 */
const TerminalPanel = ({ logs, isOpen, onToggle }: { logs: any[], isOpen: boolean, onToggle: () => void }) => {
  return (
    <div className={`border-t border-zinc-800 bg-black/40 transition-all duration-500 overflow-hidden ${isOpen ? 'h-[240px]' : 'h-10'}`}>
      <button 
        onClick={onToggle}
        className="w-full h-10 px-6 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal size={12} className={isOpen ? 'text-accent' : 'text-zinc-500'} />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">System Pulse</span>
        </div>
        <ChevronDown size={14} className={`text-zinc-600 transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} />
      </button>
      <div className="h-[200px] overflow-y-auto p-6 font-mono text-[9px] space-y-2 custom-scrollbar text-left">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3 group">
            <span className="text-zinc-700 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
            <span className={log.type === 'error' ? 'text-red-400' : (log.type === 'success' ? 'text-emerald-400' : 'text-zinc-400')}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface LatticeNode {
  path: string;
  fidelity: FidelityLevel;
  confidence: number;
  tokens: number;
  reason?: string;
}

const App = () => {
  const [activeProject, setActiveProject] = useState<string>('');
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [task, setTask] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [anchorMatches, setAnchorMatches] = useState<any[]>([]);
  const [selectedAnchors, setSelectedAnchors] = useState<string[]>([]);
  const [isLatticeExpanded, setIsLatticeExpanded] = useState(false);
  
  const [isIndexing, setIsIndexing] = useState(false);
  const [isIndexed, setIsIndexed] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState({ completed: 0, total: 0 });

  const [lattice, setLattice] = useState<LatticeNode[]>([]);
  const [isForging, setIsForging] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [councilInsights, setInsights] = useState<any[]>([]);
  
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message, type });

  const fetchIndexingStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/indexing/status`);
      setIsIndexed(response.data.indexed);
    } catch (error) {
      console.error('Failed to fetch indexing status', error);
    }
  };

  const handleStartIndexing = async () => {
    setIsIndexing(true);
    showToast('Initializing semantic indexing...', 'info');
    try {
      await axios.post(`${API_BASE}/indexing/run`);
    } catch (error) {
      showToast('Indexing failed. Is LM Studio running?', 'error');
      setIsIndexing(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE}/projects`);
      setActiveProject(response.data.active);
      setRecentProjects(response.data.recent);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    }
  };

  const handleSwitchProject = async (path: string) => {
    try {
      await axios.post(`${API_BASE}/projects/active`, { path });
      // UI refresh is handled by the socket listener
    } catch (error) {
      showToast('Failed to switch project', 'error');
    }
  };

  const handleAddProject = async (path: string) => {
    try {
      await axios.post(`${API_BASE}/projects`, { path });
      await handleSwitchProject(path); // Auto-switch after adding
      showToast('Project opened successfully', 'success');
    } catch (error) {
      showToast('Failed to add project', 'error');
    }
  };

  const resetState = () => {
    setTask('');
    setAnchorMatches([]);
    setSelectedAnchors([]);
    setLattice([]);
    setIsLatticeExpanded(false);
    setPreviewContent(null);
    setInsights([]);
  };

  // 1. Anchor Discovery
  const handleFindAnchors = async () => {
    setIsSearching(true);
    setIsLatticeExpanded(false);
    try {
      console.log('Finding anchors for:', task);
      const response = await axios.post(`${API_BASE}/context/auto-select`, { objective: task });
      setAnchorMatches(response.data.matches);
      
      // Auto-select anchors with high score
      const autoAnchors = response.data.matches
        .filter((m: any) => m.score > 0.5)
        .map((m: any) => m.path);
      setSelectedAnchors(autoAnchors);
      
      showToast(`Identified ${response.data.matches.length} semantic anchors.`, 'success');
    } catch (error) {
      showToast('Anchor discovery failed.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleAnchor = (path: string) => {
    setSelectedAnchors(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  // 2. Lattice Expansion (Triggered manually)
  const handleAcceptAnchors = async () => {
    if (selectedAnchors.length === 0) return;
    
    showToast('Expanding lattice with dependencies...', 'info');
    try {
      // Fetch the full graph to find neighbors
      const response = await axios.get(`${API_BASE}/graph`);
      const { edges, nodes } = response.data;
      
      const newLattice: LatticeNode[] = [];
      const visited = new Set<string>();

      // Add anchors as FULL fidelity
      selectedAnchors.forEach(path => {
        const nodeData = nodes.find((n: any) => n.id === path);
        newLattice.push({ 
          path, 
          fidelity: 'full', 
          confidence: 1.0, 
          tokens: nodeData?.tokens || 0,
          reason: 'Primary Anchor' 
        });
        visited.add(path);
      });

      // BFS expansion (1 hop)
      edges.forEach((edge: any) => {
        if (selectedAnchors.includes(edge.source) && !visited.has(edge.target)) {
          const nodeData = nodes.find((n: any) => n.id === edge.target);
          newLattice.push({ 
            path: edge.target, 
            fidelity: 'skeleton', 
            confidence: 0.7, 
            tokens: nodeData?.tokens || 0,
            reason: `Dependency: ${edge.source.split('/').pop()} imports this` 
          });
          visited.add(edge.target);
        }
        if (selectedAnchors.includes(edge.target) && !visited.has(edge.source)) {
          const nodeData = nodes.find((n: any) => n.id === edge.source);
          newLattice.push({ 
            path: edge.source, 
            fidelity: 'skeleton', 
            confidence: 0.6, 
            tokens: nodeData?.tokens || 0,
            reason: `Impact: ${edge.target.split('/').pop()} depends on this` 
          });
          visited.add(edge.source);
        }
      });

      setLattice(newLattice.sort((a, b) => b.confidence - a.confidence));
      setIsLatticeExpanded(true);
      showToast('Lattice expansion complete.', 'success');
    } catch (error) {
      showToast('Lattice expansion failed.', 'error');
    }
  };

  // 3. Forging
  const handleGenerate = async () => {
    setIsForging(true);
    try {
      const selections: Record<string, string> = {};
      lattice.forEach(node => {
        selections[node.path] = node.fidelity;
      });

      const response = await axios.post(`${API_BASE}/prompt`, { 
        selections, 
        task,
        provider: 'universal',
        preset: 'edge-analyst'
      });
      setPreviewContent(response.data.content);
      setInsights(response.data.insights || []);
      showToast('Context Pack forged successfully.', 'success');
    } catch (error) {
      showToast('Forging failed.', 'error');
    } finally {
      setIsForging(false);
    }
  };

  const updateFidelity = (path: string, fidelity: FidelityLevel) => {
    setLattice(prev => prev.map(n => n.path === path ? { ...n, fidelity } : n));
  };

  useEffect(() => {
    fetchProjects();
    fetchIndexingStatus();

    const socket = io(SOCKET_URL);
    socket.on('system_log', (log) => {
      setSystemLogs(prev => [log, ...prev].slice(0, 50));
    });
    socket.on('project_changed', (data) => {
      setActiveProject(data.path);
      resetState();
      fetchIndexingStatus();
      showToast(`Context shifted to: ${data.path.split(/[\\/]/).pop()}`, 'info');
    });
    socket.on('indexing_progress', (data) => {
      setIsIndexing(true);
      setIndexingProgress({ completed: data.completed, total: data.total });
    });
    socket.on('indexing_complete', () => {
      setIsIndexing(false);
      setIsIndexed(true);
      showToast('Indexing complete. Semantic search active.', 'success');
    });
    return () => { socket.disconnect(); };
  }, []);

  return (
    <div className="flex h-screen w-screen bg-[#050505] text-zinc-100 overflow-hidden font-sans selection:bg-accent/30 flex-col">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {previewContent && <ContextPreview content={previewContent} onClose={() => setPreviewContent(null)} />}

      {/* Header */}
      <header className="px-10 py-6 border-b border-zinc-800/50 bg-[#080808] flex items-center justify-between backdrop-blur-2xl z-10">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20">
            <Zap className="text-accent" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white uppercase italic">Context Forge</h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em]">High-Fidelity AI Briefing Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <ProjectSwitcher 
            activePath={activeProject}
            recentProjects={recentProjects}
            onSwitch={handleSwitchProject}
            onAdd={handleAddProject}
          />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Topology Synced</span>
          </div>
        </div>
      </header>

      {/* Main Surface */}
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/[0.02] via-transparent to-transparent">
        <div className="max-w-6xl mx-auto px-10 py-12 space-y-12 pb-32">
          
          <IntentTerminal 
            intent={task}
            setIntent={setTask}
            onFindAnchors={handleFindAnchors}
            onStartIndexing={handleStartIndexing}
            isLoading={isSearching}
            isIndexed={isIndexed}
            isIndexing={isIndexing}
            indexingProgress={indexingProgress}
          />

          <AnchorDiscovery 
            matches={anchorMatches}
            anchors={selectedAnchors}
            onToggleAnchor={toggleAnchor}
          />

          {isLatticeExpanded && councilInsights.length > 0 && (
            <AdvisoryCouncil insights={councilInsights} />
          )}

          {!isLatticeExpanded && anchorMatches.length > 0 && (
            <div className="flex justify-center animate-in fade-in zoom-in-95 duration-500">
              <button
                onClick={handleAcceptAnchors}
                disabled={selectedAnchors.length === 0}
                className="group relative px-12 py-4 bg-accent text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[-20deg]" />
                <CheckCircle2 size={18} />
                Confirm Anchors & Expand Lattice
              </button>
            </div>
          )}

          {isLatticeExpanded && (
            <LatticeCurator 
              nodes={lattice}
              onUpdateFidelity={updateFidelity}
              onGenerate={handleGenerate}
              isGenerating={isForging}
            />
          )}

        </div>
      </main>

      {/* Footer / Pulse */}
      <footer className="fixed bottom-0 left-0 right-0 z-20">
        <TerminalPanel 
          logs={systemLogs} 
          isOpen={isTerminalOpen} 
          onToggle={() => setIsTerminalOpen(!isTerminalOpen)} 
        />
      </footer>
    </div>
  );
};

export default App;
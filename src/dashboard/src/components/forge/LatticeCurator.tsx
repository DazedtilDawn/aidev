import React from 'react';
import { Layers, FileCode, Cpu, EyeOff, Info } from 'lucide-react';

export type FidelityLevel = 'full' | 'skeleton' | 'exclude';

interface LatticeNode {
  path: string;
  fidelity: FidelityLevel;
  confidence: number;
  tokens: number;
  reason?: string;
}

interface LatticeCuratorProps {
  nodes: LatticeNode[];
  onUpdateFidelity: (path: string, level: FidelityLevel) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const LatticeCurator: React.FC<LatticeCuratorProps> = ({
  nodes,
  onUpdateFidelity,
  onGenerate,
  isGenerating
}) => {
  if (nodes.length === 0) return null;

  const totalTokens = nodes.reduce((sum, n) => {
    if (n.fidelity === 'exclude') return sum;
    // Skeletons are ~10% of full content tokens
    return sum + (n.fidelity === 'full' ? n.tokens : Math.ceil(n.tokens * 0.1));
  }, 0);

  const budget = 100000;
  const percentage = Math.min((totalTokens / budget) * 100, 100);

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
          <Layers size={14} className="text-accent" /> Lattice Curation
        </h3>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Context Weight</span>
              <span className={`text-xs font-mono font-bold ${totalTokens > budget ? 'text-red-400' : 'text-accent'}`}>
                {totalTokens.toLocaleString()} / {budget.toLocaleString()}
              </span>
            </div>
            <div className="w-48 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full transition-all duration-500 ${totalTokens > budget ? 'bg-red-500' : 'bg-accent'} shadow-[0_0_10px_rgba(59,130,246,0.3)]`} 
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          
          <button
            onClick={onGenerate}
            disabled={isGenerating || nodes.filter(n => n.fidelity !== 'exclude').length === 0}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-20 shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            {isGenerating ? 'Forging Pack...' : 'Generate Context Pack'}
          </button>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900/50 border-b border-zinc-800">
              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-500">File Node</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 text-center">Fidelity Control</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-500">Inclusion Logic</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {nodes.map((node) => (
              <tr key={node.path} className="group hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-200">{node.path.split('/').pop()}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">{node.path}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-1 bg-black rounded-lg p-1 border border-zinc-800 w-fit mx-auto">
                    <FidelityButton 
                      active={node.fidelity === 'full'} 
                      onClick={() => onUpdateFidelity(node.path, 'full')}
                      icon={<FileCode size={12} />}
                      label="Full"
                    />
                    <FidelityButton 
                      active={node.fidelity === 'skeleton'} 
                      onClick={() => onUpdateFidelity(node.path, 'skeleton')}
                      icon={<Cpu size={12} />}
                      label="Skel"
                    />
                    <FidelityButton 
                      active={node.fidelity === 'exclude'} 
                      onClick={() => onUpdateFidelity(node.path, 'exclude')}
                      icon={<EyeOff size={12} />}
                      label="Hide"
                    />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent opacity-50" 
                        style={{ width: `${node.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                      <Info size={10} /> {node.reason || 'Structural dependency'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FidelityButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all ${
      active 
        ? 'bg-zinc-800 text-zinc-100 shadow-sm' 
        : 'text-zinc-600 hover:text-zinc-400'
    }`}
  >
    {icon}
    {label}
  </button>
);

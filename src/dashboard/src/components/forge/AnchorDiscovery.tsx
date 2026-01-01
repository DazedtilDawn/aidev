import React from 'react';
import { Box, Plus, CheckCircle2 } from 'lucide-react';

interface AnchorMatch {
  path: string;
  score: number;
}

interface AnchorDiscoveryProps {
  matches: AnchorMatch[];
  anchors: string[];
  onToggleAnchor: (path: string) => void;
}

export const AnchorDiscovery: React.FC<AnchorDiscoveryProps> = ({
  matches,
  anchors,
  onToggleAnchor
}) => {
  console.log('AnchorDiscovery rendering with:', { matches, anchors });
  if (matches.length === 0 && anchors.length === 0) return null;

  return (
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
          <Box size={14} className="text-accent" /> Anchor Discovery
        </h3>
        <span className="text-[9px] font-mono text-zinc-600">{anchors.length} selected</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {matches.map((match) => {
          const isSelected = anchors.includes(match.path);
          return (
            <button
              key={match.path}
              onClick={() => onToggleAnchor(match.path)}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left group ${
                isSelected 
                  ? 'bg-accent/10 border-accent/40 ring-1 ring-accent/20' 
                  : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${isSelected ? 'text-accent' : 'text-zinc-300'}`}>
                  {match.path.split('/').pop()}
                </p>
                <p className="text-[9px] text-zinc-600 truncate font-mono">{match.path}</p>
              </div>
              
              <div className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'}`}>
                {isSelected ? <CheckCircle2 size={14} /> : <Plus size={14} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

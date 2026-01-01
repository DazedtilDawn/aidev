import React from 'react';
import { Terminal, Sparkles, Loader2, Zap } from 'lucide-react';

interface IntentTerminalProps {
  intent: string;
  setIntent: (val: string) => void;
  onFindAnchors: () => void;
  onStartIndexing: () => void;
  isLoading: boolean;
  isIndexed: boolean;
  isIndexing: boolean;
  indexingProgress: { completed: number, total: number };
}

export const IntentTerminal: React.FC<IntentTerminalProps> = ({ 
  intent, 
  setIntent, 
  onFindAnchors,
  onStartIndexing,
  isLoading,
  isIndexed,
  isIndexing,
  indexingProgress
}) => {
  return (
    <div className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Terminal size={18} className="text-accent" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Context Intent</h2>
        </div>

        {!isIndexed && !isIndexing && (
          <button
            onClick={onStartIndexing}
            className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all"
          >
            <Zap size={12} /> Index Project
          </button>
        )}

        {isIndexing && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-accent animate-pulse">Indexing...</span>
              <div className="w-32 h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-500" 
                  style={{ width: `${(indexingProgress.completed / indexingProgress.total) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-[9px] font-mono text-zinc-500">{indexingProgress.completed}/{indexingProgress.total}</span>
          </div>
        )}
      </div>
      
      <div className="relative group">
        <textarea
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="Describe what you want to work on (e.g., 'Add rate limiting to the auth routes')"
          className="w-full h-32 bg-transparent text-lg font-medium text-zinc-100 placeholder:text-zinc-700 focus:outline-none resize-none leading-relaxed"
        />
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/50">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-zinc-500 font-mono italic leading-none">
              AI will identify anchors based on semantic relevance and structural dominance.
            </p>
            {!isIndexed && (
              <p className="text-[9px] text-amber-500/60 font-mono italic leading-none">
                Note: Project not indexed. Semantic search will be limited.
              </p>
            )}
          </div>
          
          <button
            onClick={onFindAnchors}
            disabled={!intent || isLoading || isIndexing}
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-100 text-black rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-white transition-all disabled:opacity-20 active:scale-95"
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            Find Anchors
          </button>
        </div>
      </div>
    </div>
  );
};

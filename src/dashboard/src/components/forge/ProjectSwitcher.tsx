import React, { useState } from 'react';
import { FolderOpen, ChevronDown, Check, Plus } from 'lucide-react';

interface ProjectSwitcherProps {
  activePath: string;
  recentProjects: string[];
  onSwitch: (path: string) => void;
  onAdd: (path: string) => void;
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  activePath,
  recentProjects,
  onSwitch,
  onAdd
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newPath, setNewPath] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPath) {
      // Handle Windows paths by trimming and removing quotes if copy-pasted
      const cleanedPath = newPath.trim().replace(/^["']|["']$/g, '');
      onAdd(cleanedPath);
      setNewPath('');
      setIsAdding(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all group"
      >
        <FolderOpen size={16} className="text-zinc-500 group-hover:text-accent transition-colors" />
        <div className="flex flex-col items-start">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 leading-none mb-1">Active Project</span>
          <span className="text-xs font-bold text-zinc-300 truncate max-w-[200px]">{activePath.split(/[\/]/).pop()}</span>
        </div>
        <ChevronDown size={14} className={`text-zinc-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-[#0a0a0a] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/30">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Recent Projects</h4>
          </div>
          
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {recentProjects.map(path => (
              <button
                key={path}
                onClick={() => { onSwitch(path); setIsOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors text-left group"
              >
                <div className="min-w-0 flex flex-col">
                  <span className="text-xs font-bold text-zinc-300 truncate">{path.split(/[\/]/).pop()}</span>
                  <span className="text-[9px] text-zinc-600 font-mono truncate">{path}</span>
                </div>
                {path === activePath && <Check size={14} className="text-emerald-500" />}
              </button>
            ))}
          </div>

          <div className="p-2 bg-zinc-900/20 border-t border-zinc-800">
            {isAdding ? (
              <form onSubmit={handleAdd} className="p-2 space-y-2">
                <input 
                  autoFocus
                  type="text"
                  placeholder="Absolute path to project..."
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-accent/50 transition-all"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-accent text-white py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">Open</button>
                  <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-black uppercase tracking-widest">Cancel</button>
                </div>
              </form>
            ) : (
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-zinc-300 transition-all"
              >
                <Plus size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Open Project...</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

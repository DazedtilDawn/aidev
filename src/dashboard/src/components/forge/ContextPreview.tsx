import React, { useState } from 'react';
import { Share2, Copy, CheckCircle2, X } from 'lucide-react';

interface ContextPreviewProps {
  content: string;
  onClose: () => void;
}

export const ContextPreview: React.FC<ContextPreviewProps> = ({ content, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-6xl h-full bg-[#0a0a0a] border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-8 py-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-accent/10 rounded-xl">
              <Share2 size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-200">Context Artifact</h2>
              <p className="text-[10px] text-zinc-500 font-mono italic">Ready for LLM injection</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCopy}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-zinc-100 text-black hover:bg-white active:scale-95'
              }`}
            >
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {copied ? 'Copied to Clipboard' : 'Copy Content'}
            </button>
            
            <button 
              onClick={onClose} 
              className="p-3 hover:bg-white/5 rounded-xl transition-colors text-zinc-500"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-10 bg-black custom-scrollbar">
          <pre className="font-mono text-xs text-emerald-500/80 leading-relaxed whitespace-pre-wrap selection:bg-emerald-500/20">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
};

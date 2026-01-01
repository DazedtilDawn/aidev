import React from 'react';
import { Shield, History, Map, Info } from 'lucide-react';

interface Insight {
  advisor: string;
  label: string;
  content: string;
  provenance: string;
}

interface AdvisoryCouncilProps {
  insights: Insight[];
}

export const AdvisoryCouncil: React.FC<AdvisoryCouncilProps> = ({ insights }) => {
  if (insights.length === 0) return null;

  return (
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Advisory Council Insights</h3>
        <div className="h-px flex-1 bg-zinc-800/50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, i) => (
          <div key={i} className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 space-y-3 group hover:border-accent/30 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getAdvisorIcon(insight.advisor)}
                <span className="text-[10px] font-black uppercase tracking-widest text-accent">{insight.advisor}</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-600 italic">via {insight.provenance.split(/[\/]/).pop()}</span>
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-zinc-200 mb-1">{insight.label}</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed italic font-serif">
                "{insight.content}"
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const getAdvisorIcon = (name: string) => {
  switch (name.toLowerCase()) {
    case 'historian': return <History size={14} className="text-amber-500" />;
    case 'architect': return <Shield size={14} className="text-indigo-500" />;
    case 'visionary': return <Map size={14} className="text-emerald-500" />;
    default: return <Info size={14} className="text-zinc-500" />;
  }
};

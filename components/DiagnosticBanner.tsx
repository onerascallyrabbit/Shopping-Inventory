
import React from 'react';

interface DiagnosticBannerProps {
  user?: any;
  isGuest: boolean;
  onExitGuest: () => void;
}

const DiagnosticBanner: React.FC<DiagnosticBannerProps> = ({ user, isGuest, onExitGuest }) => {
  if (!isGuest && user) return null;

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-3 flex flex-col items-center space-y-3 text-center z-50">
      <div className="flex items-center space-x-2">
        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isGuest ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Diagnostic Console</span>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {isGuest && <button onClick={onExitGuest} className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[8px] font-bold text-amber-400 tracking-wider uppercase">Exit Guest Mode</button>}
        <span className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[8px] font-bold text-indigo-400 tracking-wider uppercase">Local Session</span>
      </div>
    </div>
  );
};

export default DiagnosticBanner;

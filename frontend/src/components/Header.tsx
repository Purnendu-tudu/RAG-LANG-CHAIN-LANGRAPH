import React from 'react';
import { Sparkles, Cpu, Layers, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { LLMProvider, ActiveTab } from '../types';
import { Navigation } from './Navigation';

interface HeaderProps {
  provider: LLMProvider;
  onProviderChange: (provider: LLMProvider) => void;
  isBackendHealthy: boolean;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  provider,
  onProviderChange,
  isBackendHealthy,
  activeTab,
  onTabChange
}) => {
  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-800 shadow-xl">
      {/* Top row: brand + status + provider */}
      <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1.5 sm:p-2 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20 text-white flex-shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-100 tracking-tight text-base sm:text-lg whitespace-nowrap">LangGraph RAG</h1>
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                Decoupled API
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-400">FastAPI + LangChain + FAISS + React</p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Health status */}
          <div className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            {isBackendHealthy ? (
              <>
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                <span className="hidden sm:inline text-emerald-400 font-medium">FastAPI Online</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 animate-pulse" />
                <span className="hidden sm:inline text-amber-400 font-medium">Connecting...</span>
              </>
            )}
          </div>

          {/* Swagger docs — hidden on xs */}
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-medium text-slate-300 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Swagger Docs</span>
          </a>

          {/* Provider toggle */}
          <div className="flex items-center p-0.5 bg-slate-900/90 rounded-xl border border-slate-800">
            {[
              { val: 'google' as LLMProvider, label: 'Google', icon: Sparkles },
              { val: 'ollama' as LLMProvider, label: 'Ollama', icon: Cpu },
            ].map(({ val, label, icon: Icon }) => (
              <button
                key={val}
                onClick={() => onProviderChange(val)}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  provider === val
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span className="hidden xs:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Navigation tabs (scrollable on mobile) */}
      <div className="px-3 sm:px-6 pb-2 overflow-x-auto scrollbar-none">
        <Navigation activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </header>
  );
};

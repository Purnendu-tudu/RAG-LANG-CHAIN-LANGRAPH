import React from 'react';
import { Layers, FileSliders, Brain, Activity, Zap } from 'lucide-react';
import { ActiveTab } from '../types';
export type { ActiveTab };

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { key: 'rag' as ActiveTab,              label: 'RAG Portal',  shortLabel: 'RAG',   icon: Layers },
    { key: 'document' as ActiveTab,         label: 'Indexer',     shortLabel: 'Index', icon: FileSliders },
    { key: 'gevernovai' as ActiveTab,       label: 'GE VernovAI', shortLabel: 'Agent', icon: Brain },
    { key: 'livepresentation' as ActiveTab, label: 'Live Exec',   shortLabel: 'Exec',  icon: Zap },
    { key: 'presentation' as ActiveTab,     label: 'Live Flow',   shortLabel: 'Flow',  icon: Activity },
  ];

  return (
    <nav className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 w-max">
      {tabs.map(({ key, label, shortLabel, icon: Icon }) => {
        const isActive = activeTab === key;
        const isAgent = key === 'gevernovai';
        const isFlow = key === 'presentation';
        const isLive = key === 'livepresentation';

        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              isActive
                ? isAgent
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : isLive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : isFlow
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                : isAgent
                  ? 'text-sky-400 hover:text-sky-300 hover:bg-sky-950/30'
                  : isLive
                    ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/30'
                    : isFlow
                      ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                      : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive && (isAgent || isFlow || isLive) ? 'text-slate-950' : ''}`} />
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

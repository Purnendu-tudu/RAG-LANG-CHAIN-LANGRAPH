import React from 'react';
import { Layers, FileSliders, Brain } from 'lucide-react';

export type ActiveTab = 'rag' | 'document' | 'gevernovai';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { key: 'rag' as ActiveTab,        label: 'RAG Portal',  shortLabel: 'RAG',    icon: Layers },
    { key: 'document' as ActiveTab,   label: 'Indexer',     shortLabel: 'Index',  icon: FileSliders },
    { key: 'gevernovai' as ActiveTab, label: 'GE VernovAI', shortLabel: 'Agent',  icon: Brain },
  ];

  return (
    <nav className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 w-max">
      {tabs.map(({ key, label, shortLabel, icon: Icon }) => {
        const isActive = activeTab === key;
        const isAgent = key === 'gevernovai';
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              isActive
                ? isAgent
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                : isAgent
                  ? 'text-sky-400 hover:text-sky-300 hover:bg-sky-950/30'
                  : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive && isAgent ? 'text-slate-950' : ''}`} />
            {/* Short label on mobile, full on sm+ */}
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

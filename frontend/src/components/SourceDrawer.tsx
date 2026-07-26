import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, FileText, Hash } from 'lucide-react';
import { SourceDocument } from '../types';

interface SourceDrawerProps {
  isOpen: boolean;
  sources: SourceDocument[];
  onClose: () => void;
}

export const SourceDrawer: React.FC<SourceDrawerProps> = ({ isOpen, sources, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
          />

          {/* Drawer panel — full-width on mobile, max-w-md on larger */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-[#0d1322] border-l border-slate-800 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                <h2 className="font-bold text-slate-100 text-base sm:text-lg">Retrieved RAG Chunks</h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono">
                  {sources.length}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
              {sources.map((src, index) => (
                <div
                  key={src.id || index}
                  className="p-3 sm:p-4 rounded-xl glass-panel border border-slate-800/80 hover:border-slate-700 transition-all space-y-2"
                >
                  {/* Chunk header */}
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                    <span className="flex items-center space-x-1">
                      <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      <span>Chunk #{src.id || index + 1}</span>
                    </span>
                    <span className="text-slate-500 font-mono normal-case">FAISS Match</span>
                  </div>

                  {/* Metadata pills */}
                  {src.metadata && Object.keys(src.metadata).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {src.metadata.document_name && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-950/50 border border-sky-500/20 text-[10px] text-sky-300 truncate max-w-[150px]">
                          📄 {src.metadata.document_name}
                        </span>
                      )}
                      {src.metadata.page_number && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-400">
                          p.{src.metadata.page_number}
                        </span>
                      )}
                      {src.metadata.section_heading && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-400 truncate max-w-[160px]">
                          § {src.metadata.section_heading}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 sm:p-3 rounded-lg border border-slate-800/50 break-words">
                    {src.content}
                  </p>
                </div>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

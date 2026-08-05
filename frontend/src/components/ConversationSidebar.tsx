import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MessageSquare, Trash2, Edit2, Check, X, Search,
  ChevronLeft, ChevronRight, Sparkles, Clock, AlertCircle
} from 'lucide-react';
import { ConversationMetadata } from '../types';

interface ConversationSidebarProps {
  conversations: ConversationMetadata[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartRename = (c: ConversationMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(id);
  };

  return (
    <aside
      className={`relative flex flex-col h-full bg-slate-50/90 border-r border-slate-200 transition-all duration-300 z-20 flex-shrink-0 ${
        isOpen ? 'w-72 sm:w-80' : 'w-14 sm:w-16'
      }`}
    >
      {/* Toggle collapse button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-4 bg-white border border-slate-200 rounded-full p-1 shadow-md hover:bg-slate-50 text-slate-600 z-30 transition-transform"
        title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
      >
        {isOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {isOpen ? (
        <div className="flex flex-col h-full p-3 space-y-3 overflow-hidden">
          {/* Top Bar / New Conversation */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onNewConversation}
              className="flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl text-xs pl-8 pr-3 py-1.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-800 placeholder-slate-400 transition-all"
            />
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scroll-smooth">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center text-slate-400 p-3">
                <MessageSquare className="w-6 h-6 mb-1 text-slate-300" />
                <span className="text-xs font-medium">No conversations found</span>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeId;
                const isEditing = editingId === conv.id;

                return (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`group relative flex items-center space-x-2 px-3 py-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-white border border-emerald-300 text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <MessageSquare
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />

                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleSaveRename(conv.id, e)}
                        className="flex items-center space-x-1 flex-1 min-w-0"
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          autoFocus
                          className="flex-1 bg-slate-50 border border-emerald-400 text-slate-900 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveRename(conv.id, e)}
                          className="text-emerald-600 hover:text-emerald-700 p-0.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex-1 min-w-0 pr-12">
                        <p className="truncate text-slate-800 leading-tight">{conv.title}</p>
                        <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{new Date(conv.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                          <span>·</span>
                          <span>{conv.message_count} msgs</span>
                        </div>
                      </div>
                    )}

                    {/* Actions (Rename / Delete) */}
                    {!isEditing && (
                      <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center space-x-1 bg-gradient-to-l from-white via-white to-transparent pl-2 transition-opacity">
                        <button
                          onClick={(e) => handleStartRename(conv, e)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
                          title="Rename Chat"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(conv.id, e)}
                          className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                          title="Delete Chat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer Clear All */}
          {conversations.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              {showClearConfirm ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                  <span className="text-rose-700 font-semibold">Delete all?</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => { onClearAll(); setShowClearConfirm(false); }}
                      className="px-2 py-1 bg-rose-600 text-white rounded text-[11px] font-bold"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px] font-bold"
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Chats</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Collapsed Minimal Icon View */
        <div className="flex flex-col items-center py-4 space-y-4">
          <button
            onClick={onNewConversation}
            className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 shadow-md transition-all"
            title="New Conversation"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="w-8 h-[1px] bg-slate-200" />

          <div className="flex-1 space-y-2 overflow-y-auto w-full px-2">
            {conversations.slice(0, 8).map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full p-2.5 rounded-xl flex items-center justify-center transition-all ${
                  conv.id === activeId
                    ? 'bg-white border border-emerald-300 text-emerald-600 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                }`}
                title={conv.title}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};

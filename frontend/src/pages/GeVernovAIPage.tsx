import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Zap, Send, Loader2, Bot, User, BookOpen, Sparkles, Cpu, Sliders,
  FileText, ListChecks, Search, StopCircle, AlertTriangle, FolderOpen,
  FileWarning, ChevronDown, Brain,
} from 'lucide-react';
import { ChatMessage as ChatMessageType, SourceDocument, LLMProvider, ChatApiResponse, QueryMode, ConversationMetadata, preprocessMarkdownText } from '../types';
import { SourceDrawer } from '../components/SourceDrawer';
import { SupportWidget } from '../components/SupportWidget';
import { MermaidDiagram } from '../components/MermaidDiagram';
import { ConversationSidebar } from '../components/ConversationSidebar';

import { KpiWidget } from '../components/KpiWidget';
import { InteractiveChartWidget } from '../components/InteractiveChartWidget';

const API_BASE = 'http://localhost:8000';

const WELCOME_MESSAGE: ChatMessageType = {
  id: 'gev-welcome-1',
  sender: 'assistant',
  text: "Welcome to **GE VernovAI**! How can I help you?",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

interface IndexedDoc { filename: string; chunk_count: number; }

const markdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const content = String(children).replace(/\n$/, '');

    if (!inline && language === 'mermaid') {
      return <MermaidDiagram chart={content} />;
    }

    if (!inline && (language === 'kpi' || language === 'kpi-card')) {
      try {
        const parsed = JSON.parse(content);
        return <KpiWidget data={parsed} />;
      } catch (e) {
        // Fallthrough if parsing fails
      }
    }

    if (!inline && (language === 'chart' || language === 'rechart' || language === 'bargraph' || language === 'piechart')) {
      try {
        const parsed = JSON.parse(content);
        return <InteractiveChartWidget payload={parsed} />;
      } catch (e) {
        // Fallthrough if parsing fails
      }
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

export const GeVernovAIPage: React.FC = () => {
  const [provider, setProvider] = useState<LLMProvider>('google');
  const [queryMode, setQueryMode] = useState<QueryMode>('qa');
  const [temperature, setTemperature] = useState<number>(0.2);
  const [input, setInput] = useState('');
  const [emptyWarning, setEmptyWarning] = useState(false);
  const [activeSources, setActiveSources] = useState<SourceDocument[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ── Multi-Conversation State
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME_MESSAGE]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<boolean>(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Fetch Conversations List
  const { data: conversations = [], refetch: fetchConversations } = useQuery<ConversationMetadata[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/conversations`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 10000,
  });

  // ── Handle Selecting a Conversation
  const handleSelectConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveId(id);
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setMessages([WELCOME_MESSAGE]);
        }
      }
    } catch (e) {
      console.error('Failed to load conversation', e);
    }
  }, []);

  // ── Handle Creating a New Conversation
  const handleNewConversation = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/conversations/new`, { method: 'POST' });
      if (res.ok) {
        const meta = await res.json();
        setActiveId(meta.id);
        setMessages([WELCOME_MESSAGE]);
        fetchConversations();
      }
    } catch (e) {
      setActiveId(null);
      setMessages([WELCOME_MESSAGE]);
    }
  }, [fetchConversations]);

  // ── Handle Renaming a Conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await fetch(`${API_BASE}/api/conversations/${id}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      fetchConversations();
    } catch (e) {
      console.error('Failed to rename conversation', e);
    }
  };

  // ── Handle Deleting a Conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/conversations/${id}`, { method: 'DELETE' });
      if (activeId === id) {
        handleNewConversation();
      } else {
        fetchConversations();
      }
    } catch (e) {
      console.error('Failed to delete conversation', e);
    }
  };

  const handleClearAllConversations = async () => {
    try {
      await fetch(`${API_BASE}/api/conversations/clear`, { method: 'POST' });
      handleNewConversation();
    } catch (e) {
      console.error('Failed to clear conversations', e);
    }
  };

  // ── Backend health check
  const { data: healthData, isError: healthError } = useQuery<{ status: string }>({
    queryKey: ['health-gev'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/health`);
      if (!res.ok) throw new Error('Backend offline');
      return res.json();
    },
    refetchInterval: 5000,
    retry: 1,
  });
  const isOnline = !healthError && healthData?.status === 'healthy';
  const isChecking = !healthData && !healthError;

  // ── Indexed documents
  const { data: indexedDocsData } = useQuery<{ documents: IndexedDoc[]; total_documents: number }>({
    queryKey: ['indexed-documents-gev'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/indexed-documents`);
      if (!res.ok) return { documents: [], total_documents: 0, total_chunks: 0 };
      return res.json();
    },
    refetchInterval: 10000,
  });

  const hasIndexedDocs = (indexedDocsData?.total_documents ?? 0) > 0;

  // ── Suggested questions (unused in UI but kept for API compatibility)
  useQuery<{ questions: string[] }>({
    queryKey: ['suggested-questions'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/suggested-questions`);
      if (!res.ok) return { questions: [] };
      return res.json();
    },
  });

  // ── Chat mutation with conversation memory
  const gevMutation = useMutation<ChatApiResponse, Error, string>({
    mutationFn: async (question: string) => {
      abortRef.current = false;
      const payload = {
        question,
        provider,
        temperature,
        query_mode: queryMode,
        conversation_id: activeId,
      };

      let res = await fetch(`${API_BASE}/api/gevernovai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 404) {
        res = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to communicate with GE VernovAI backend.');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (abortRef.current) return;
      if (data.conversation_id && !activeId) {
        setActiveId(data.conversation_id);
      }
      const botMsg: ChatMessageType = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: data.answer,
        sources: data.sources,
        provider: data.provider,
        queryMode,
        temperature,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      fetchConversations();
    },
    onError: (err) => {
      if (abortRef.current) return;
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        sender: 'assistant',
        text: `⚠️ **Error**: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    },
  });

  const handleSend = useCallback((text: string) => {
    const q = text.trim();
    if (!q) {
      setEmptyWarning(true);
      setTimeout(() => setEmptyWarning(false), 2500);
      return;
    }
    if (gevMutation.isPending) return;
    setEmptyWarning(false);
    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setInput('');
    gevMutation.mutate(q);
  }, [gevMutation]);

  const handleStop = () => { abortRef.current = true; gevMutation.reset(); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); }
  };

  const getFirstCitation = (sources?: SourceDocument[]) => {
    if (!sources || sources.length === 0) return null;
    const s = sources[0];
    return {
      doc: s.metadata?.document_name || s.metadata?.source || 'Indexed Document',
      page: s.metadata?.page_number,
      section: s.metadata?.section_heading || s.metadata?.subsection,
    };
  };



  return (
    <div className="flex h-screen bg-white text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-900 overflow-hidden">
      {/* ── Conversation Management Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onClearAll={handleClearAllConversations}
      />

      {/* ── Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white relative">

      {/* ── Header */}
      <header className="bg-white/90 border-b border-slate-200 px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-sm backdrop-blur-md z-10">

        {/* Title row */}
        <div className="flex items-center justify-between sm:justify-start sm:space-x-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 flex-shrink-0">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">GE VernovAI</h1>
              {/* Status dot */}
              <div className="relative flex items-center" title={isChecking ? 'Connecting...' : isOnline ? 'Backend connected' : 'Backend offline'}>
                {isChecking ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                ) : isOnline ? (
                  <>
                    <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-60" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2">
          {/* Temperature Slider */}
          <div className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs flex-1 sm:flex-none sm:min-w-[160px]">
            <Sliders className="w-3 h-3 text-emerald-600 flex-shrink-0" />
            <span className="text-slate-600 font-medium whitespace-nowrap hidden xs:inline">Temp:</span>
            <input
              type="range" min="0.0" max="1.0" step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="flex-1 min-w-[50px] accent-emerald-600 cursor-pointer"
              title={`Temperature: ${temperature}`}
            />
            <span className="font-mono font-bold text-slate-800 w-6 text-center flex-shrink-0 text-[11px]">
              {temperature.toFixed(1)}
            </span>
          </div>

          {/* Provider buttons */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 flex-shrink-0">
            {[
              { val: 'google' as LLMProvider, label: 'Gemini', icon: Sparkles },
              { val: 'ollama' as LLMProvider, label: 'Ollama', icon: Cpu },
            ].map(({ val, label, icon: Icon }) => (
              <button
                key={val}
                onClick={() => setProvider(val)}
                className={`flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  provider === val
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3 h-3 flex-shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>



      {/* ── Chat messages */}
      <div className="flex-1 overflow-y-auto scroll-smooth px-3 sm:px-4 md:px-6 py-4 space-y-4 max-w-4xl w-full mx-auto">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const citation = !isUser ? getFirstCitation(msg.sources) : null;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className={`flex w-full max-w-full overflow-hidden ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end gap-2 max-w-full sm:max-w-[85%] md:max-w-[80%] min-w-0 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar — small, sits at bottom of bubble */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                  isUser ? 'bg-emerald-600 text-white' : 'bg-slate-100 border border-slate-200 text-emerald-700'
                }`}>
                  {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                </div>

                {/* Bubble + meta — shrinks to content */}
                <div className={`flex flex-col gap-1 min-w-0 max-w-full overflow-hidden ${isUser ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {msg.timestamp}
                  </span>

                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed max-w-full min-w-0 break-words overflow-hidden ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-br-sm shadow-sm'
                      : 'bg-slate-50 text-slate-900 border border-slate-200 rounded-bl-sm shadow-sm'
                  }`}>
                    {isUser ? (
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    ) : (
                      <div className="prose prose-slate prose-sm max-w-full min-w-0 break-words prose-p:my-1 prose-p:leading-relaxed prose-pre:bg-white prose-pre:border prose-pre:border-slate-200 prose-pre:text-slate-900 prose-table:text-xs overflow-x-auto">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {preprocessMarkdownText(msg.text)}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Citation */}
                  {citation && (
                    <div className="flex items-center flex-wrap gap-1 text-[10px] text-emerald-700 px-0.5 font-medium">
                      <FolderOpen className="w-2.5 h-2.5 flex-shrink-0 text-emerald-600" />
                      <span className="truncate max-w-[140px]">{citation.doc}</span>
                      {citation.page && <span>· p.{citation.page}</span>}
                    </div>
                  )}

                  {/* Sources drawer */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <button
                      onClick={() => { setActiveSources(msg.sources!); setIsDrawerOpen(true); }}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] font-semibold text-emerald-700 transition-all"
                    >
                      <BookOpen className="w-2.5 h-2.5" />
                      <span>{msg.sources.length} Source{msg.sources.length > 1 ? 's' : ''}</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                  )}

                  {/* Interactive Support Widget when info is not found */}
                  {!isUser && (msg.text.toLowerCase().includes('not found') || !msg.sources || msg.sources.length === 0) && msg.id !== 'gev-welcome-1' && (
                    <SupportWidget />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Thinking indicator */}
        {gevMutation.isPending && (
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2 px-3 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin flex-shrink-0" />
              <span className="text-xs font-medium tracking-wide">Thinking<span className="animate-pulse">...</span></span>
            </div>
            <button
              onClick={handleStop}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-medium text-rose-700 transition-all"
            >
              <StopCircle className="w-3 h-3" />
              <span>Stop</span>
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Bar */}
      <div className="px-3 sm:px-4 py-3 bg-white border-t border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto space-y-1.5">
          <AnimatePresence>
            {emptyWarning && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center space-x-1.5 text-xs text-amber-700 px-1"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>Please enter a question before submitting.</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder=""
              disabled={gevMutation.isPending}
              rows={1}
              className="flex-1 rounded-xl bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-900 text-sm p-3 sm:p-3.5 focus:outline-none transition-colors disabled:opacity-50 resize-none min-h-[44px] sm:min-h-[48px] max-h-28 overflow-y-auto"
            />
            <button
              type="submit"
              disabled={gevMutation.isPending}
              className="p-3 sm:p-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 font-bold disabled:opacity-50 transition-all flex-shrink-0"
            >
              {gevMutation.isPending
                ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </form>

          <p className="text-[10px] text-slate-400 text-center hidden sm:block">
            Answers are grounded strictly in indexed documents · GE VernovAI
          </p>
        </div>
      </div>
      </div>

      <SourceDrawer isOpen={isDrawerOpen} sources={activeSources} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
};

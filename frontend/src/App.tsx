import React, { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { InputBar } from './components/InputBar';
import { SourceDrawer } from './components/SourceDrawer';
import { ActiveTab } from './components/Navigation';
import { DocumentIndexingPage } from './pages/DocumentIndexingPage';
import { GeVernovAIPage } from './pages/GeVernovAIPage';
import { ChatMessage as ChatMessageType, SourceDocument, LLMProvider, ChatApiResponse } from './types';
import { Sparkles, Bot } from 'lucide-react';

const queryClient = new QueryClient();

async function sendChatRequest(question: string, provider: LLMProvider): Promise<ChatApiResponse> {
  const res = await fetch('http://localhost:8000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, provider }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to communicate with RAG FastAPI backend.');
  }

  return res.json();
}

async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:8000/api/health');
    return res.ok;
  } catch {
    return false;
  }
}

function MainApp() {
  const [provider, setProvider] = useState<LLMProvider>('google');
  const [activeTab, setActiveTab] = useState<ActiveTab>('rag');

  // Sync tab state with window location path (/document, /gevernovai)
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/document')) {
      setActiveTab('document');
    } else if (path.includes('/gevernovai')) {
      setActiveTab('gevernovai');
    } else {
      setActiveTab('rag');
    }
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'document') {
      window.history.pushState({}, '', '/document');
    } else if (tab === 'gevernovai') {
      window.history.pushState({}, '', '/gevernovai');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "👋 Welcome! I am your **LangGraph RAG Assistant**. Ask me any questions about LangChain, LangGraph state machines, or RAG architecture!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const [activeSources, setActiveSources] = useState<SourceDocument[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: isBackendHealthy = false } = useQuery({
    queryKey: ['health'],
    queryFn: checkBackendHealth,
    refetchInterval: 5000,
  });

  const chatMutation = useMutation({
    mutationFn: (question: string) => sendChatRequest(question, provider),
    onSuccess: (data) => {
      const botMessage: ChatMessageType = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: data.answer,
        sources: data.sources,
        provider: data.provider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMessage]);
    },
    onError: (error: Error) => {
      const errorMessage: ChatMessageType = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: `⚠️ **Error**: ${error.message}\n\nPlease check if your FastAPI backend server is running at \`http://localhost:8000\`.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSendMessage = (text: string) => {
    const userMsg: ChatMessageType = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    chatMutation.mutate(text);
  };

  const { data: suggestedData } = useQuery<{ questions: string[] }>({
    queryKey: ['suggested-questions'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/api/suggested-questions');
      if (!res.ok) return { questions: [] };
      return res.json();
    },
  });

  const dynamicPrompts = suggestedData?.questions || [
    "What are the main concepts in this document?",
    "Can you summarize the indexed content?",
    "What key features are highlighted?"
  ];

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Render Global Header for RAG and Document pages only */}
      {activeTab !== 'gevernovai' && (
        <Header
          provider={provider}
          onProviderChange={setProvider}
          isBackendHealthy={isBackendHealthy}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      )}

      {/* Render Active View / Page */}
      {activeTab === 'document' && <DocumentIndexingPage />}

      {activeTab === 'gevernovai' && (
        <GeVernovAIPage />
      )}

      {activeTab === 'rag' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <main className="flex-1 overflow-y-auto scroll-smooth px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
            <div className="max-w-4xl mx-auto space-y-4 pb-6 min-h-full flex flex-col justify-between">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onSelectSources={(sources) => {
                      setActiveSources(sources);
                      setIsDrawerOpen(true);
                    }}
                  />
                ))}

                {chatMutation.isPending && (
                  <div className="flex items-center space-x-3 p-4 rounded-2xl glass-panel text-slate-400 max-w-xs animate-pulse border border-slate-800">
                    <Bot className="w-5 h-5 text-indigo-400 animate-bounce" />
                    <span className="text-xs font-medium">Processing RAG Graph Workflow...</span>
                  </div>
                )}
              </div>

              {messages.length === 1 && (
                <div className="mt-6 mb-2 space-y-2">
                  <p className="text-xs text-slate-400 font-medium flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Suggested Question Inquiries:</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dynamicPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(prompt)}
                        className="px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-xs text-slate-300 hover:text-indigo-300 transition-colors text-left"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </main>

          <InputBar
            onSend={handleSendMessage}
            isLoading={chatMutation.isPending}
          />
        </div>
      )}

      <SourceDrawer
        isOpen={isDrawerOpen}
        sources={activeSources}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}

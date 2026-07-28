import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { User, Bot, BookOpen } from 'lucide-react';
import { ChatMessage as ChatMessageType, SourceDocument, preprocessMarkdownText } from '../types';
import { SupportWidget } from './SupportWidget';
import { MermaidDiagram } from './MermaidDiagram';

interface ChatMessageProps {
  message: ChatMessageType;
  onSelectSources?: (sources: SourceDocument[]) => void;
}

const markdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const content = String(children).replace(/\n$/, '');

    if (!inline && language === 'mermaid') {
      return <MermaidDiagram chart={content} />;
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSelectSources }) => {
  const isUser = message.sender === 'user';
  const isNotFound = !isUser && (message.text.toLowerCase().includes('not found') || !message.sources || message.sources.length === 0) && message.id !== 'welcome-1';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`flex w-full max-w-full overflow-hidden mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex items-end gap-2 max-w-full sm:max-w-[85%] md:max-w-[80%] min-w-0 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 border border-slate-700 text-violet-400'
        }`}>
          {isUser
            ? <User className="w-3 h-3" />
            : <Bot className="w-3 h-3" />}
        </div>

        {/* Bubble + meta */}
        <div className={`flex flex-col gap-1 min-w-0 max-w-full overflow-hidden ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed max-w-full min-w-0 break-words overflow-hidden ${
            isUser
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'glass-panel text-slate-200 border border-slate-800 rounded-bl-sm'
          }`}>
            {isUser ? (
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
            ) : (
              <div className="prose prose-invert prose-sm max-w-full min-w-0 break-words prose-p:my-1 prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-pre:text-xs overflow-x-auto">
                <ReactMarkdown components={markdownComponents}>
                  {preprocessMarkdownText(message.text)}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Sources badge */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <button
                onClick={() => onSelectSources && onSelectSources(message.sources!)}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[10px] font-medium text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer group"
              >
                <BookOpen className="w-2.5 h-2.5 group-hover:scale-110 transition-transform" />
                <span>{message.sources.length} Source{message.sources.length > 1 ? 's' : ''}</span>
              </button>
              {message.provider && (
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                  via {message.provider}
                </span>
              )}
            </div>
          )}

          {/* Support Widget */}
          {isNotFound && <SupportWidget />}
        </div>
      </div>
    </motion.div>
  );
};

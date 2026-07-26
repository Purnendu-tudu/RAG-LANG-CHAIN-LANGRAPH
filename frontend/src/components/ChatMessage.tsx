import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { User, Bot, BookOpen } from 'lucide-react';
import { ChatMessage as ChatMessageType, SourceDocument } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
  onSelectSources?: (sources: SourceDocument[]) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSelectSources }) => {
  const isUser = message.sender === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] md:max-w-[68%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 border border-slate-700 text-violet-400'
        }`}>
          {isUser
            ? <User className="w-3 h-3" />
            : <Bot className="w-3 h-3" />}
        </div>

        {/* Bubble + meta */}
        <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed w-fit ${
            isUser
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'glass-panel text-slate-200 border border-slate-800 rounded-bl-sm'
          }`}>
            {isUser ? (
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-pre:text-xs overflow-x-auto">
                <ReactMarkdown>{message.text}</ReactMarkdown>
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
        </div>
      </div>
    </motion.div>
  );
};

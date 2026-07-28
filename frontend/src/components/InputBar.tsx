import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface InputBarProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export const InputBar: React.FC<InputBarProps> = ({ onSend, isLoading }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="sticky bottom-0 w-full px-3 sm:px-4 py-3 glass-panel border-t border-slate-800">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-end gap-2 sm:gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your indexed documents..."
          rows={1}
          disabled={isLoading}
          className="flex-1 resize-none rounded-xl bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-sm p-3 sm:p-3.5 focus:outline-none transition-colors placeholder:text-slate-500 disabled:opacity-50 min-h-[44px] sm:min-h-[48px] max-h-28 overflow-y-auto"
        />
        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className="flex-shrink-0 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          {isLoading
            ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>
      </form>
    </div>
  );
};

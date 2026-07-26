export interface SourceDocument {
  id: number;
  content: string;
  metadata?: Record<string, any>;
}

export type QueryMode = 'qa' | 'summary' | 'key_takeaways' | 'deep_dive';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: SourceDocument[];
  timestamp: string;
  provider?: string;
  queryMode?: QueryMode;
  temperature?: number;
}

export interface ChatApiResponse {
  question: string;
  answer: string;
  sources: SourceDocument[];
  provider: string;
}

export type LLMProvider = 'google' | 'ollama';

export interface SourceDocument {
  id: number;
  content: string;
  metadata?: Record<string, any>;
}

export type QueryMode = 'qa' | 'summary' | 'key_takeaways' | 'deep_dive' | 'architecture';

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

export type ActiveTab = 'rag' | 'document' | 'gevernovai' | 'presentation' | 'livepresentation';

export function preprocessMarkdownText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Handle Python repr of list/dict e.g. "[{'type': 'text', 'text': '...'}]"
  if (cleaned.trim().startsWith("[{'type': 'text'") || cleaned.trim().startsWith('[{"type": "text"')) {
    try {
      const match = /'text':\s*'([\s\S]*?)'(?:,\s*'extras'|\s*\}|\s*\])/.exec(cleaned) ||
                    /"text":\s*"([\s\S]*?)"(?:,\s*"extras"|\s*\}|\s*\])/.exec(cleaned);
      if (match && match[1]) {
        cleaned = match[1].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"');
      }
    } catch {
      // Fallthrough
    }
  }

  // 2. Unescape escaped newlines if present
  if (cleaned.includes('\\n') && !cleaned.includes('\n')) {
    cleaned = cleaned.replace(/\\n/g, '\n');
  }

  // 3. Auto-wrap raw `mermaid\nflowchart` blocks in triple backticks if code fences were omitted
  const rawMermaidRegex = /(?:^|\n)(mermaid\s*\n\s*(?:flowchart|graph|sequenceDiagram|classDiagram|erDiagram|gantt|pie|gitGraph|mindmap)[\s\S]*?)(?=\n\n(?:Citation:|###|#|\*\*)|```|$)/gi;

  cleaned = cleaned.replace(rawMermaidRegex, (match, p1) => {
    if (match.includes('```')) return match;
    const body = p1.replace(/^mermaid\s*\n/i, '');
    return `\n\n\`\`\`mermaid\n${body.trim()}\n\`\`\`\n\n`;
  });

  return cleaned;
}


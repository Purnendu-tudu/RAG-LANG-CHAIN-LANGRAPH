import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileSliders, Database, CheckCircle2, Loader2, Layers, AlertCircle,
  Upload, FileText, X, Cpu, Trash2, FileWarning, RefreshCw, FolderOpen,
  AlertTriangle, Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:8000';

interface IndexResponse {
  status: string;
  message: string;
  total_chunks: number;
  chunk_size: number;
  chunk_overlap: number;
  preview_chunks: string[];
}

interface IndexedDoc {
  filename: string;
  chunk_count: number;
  indexed_at?: string;
}

interface IndexedDocumentsResponse {
  documents: IndexedDoc[];
  total_documents: number;
  total_chunks: number;
}

// File size limit: 100 MB
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const DocumentIndexingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [indexMode, setIndexMode] = useState<'pdf' | 'text'>('pdf');
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [fileWarnings, setFileWarnings] = useState<string[]>([]);

  const [content, setContent] = useState<string>(
    `# Comprehensive Guide to LangChain, LangGraph, and RAG Architecture\n\n## What is LangChain?\nLangChain is an open-source framework designed to simplify the creation of applications using Large Language Models (LLMs). It provides a standard interface for chains, integrations with hundreds of tools, and end-to-end applications for common use cases such as prompt management, vector index retrieval, and external tools interaction.\n\n## What is Retrieval-Augmented Generation (RAG)?\nRetrieval-Augmented Generation (RAG) is a technique used to optimize the output of a Large Language Model by referencing an authoritative knowledge base outside its training data sources before generating a response.`
  );

  const [chunkSize, setChunkSize] = useState<number>(400);
  const [chunkOverlap, setChunkOverlap] = useState<number>(50);

  // ── Fetch indexed documents list
  const { data: indexedDocsData, isLoading: isLoadingDocs } = useQuery<IndexedDocumentsResponse>({
    queryKey: ['indexed-documents'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/indexed-documents`);
      if (!res.ok) return { documents: [], total_documents: 0, total_chunks: 0 };
      return res.json();
    },
    refetchInterval: 5000,
  });

  const indexedDocs = indexedDocsData?.documents ?? [];
  const indexedFilenames = new Set(indexedDocs.map((d) => d.filename));

  // ── Text indexing
  const textIndexMutation = useMutation<IndexResponse, Error>({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/index-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, chunk_size: chunkSize, chunk_overlap: chunkOverlap }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to index document text.');
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['indexed-documents'] }),
  });

  // ── PDF indexing
  const pdfIndexMutation = useMutation<IndexResponse, Error>({
    mutationFn: async () => {
      const formData = new FormData();
      pdfFiles.forEach((file) => formData.append('files', file));
      formData.append('chunk_size', chunkSize.toString());
      formData.append('chunk_overlap', chunkOverlap.toString());

      const res = await fetch(`${API_BASE}/api/index-pdfs`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to parse and index PDF files via IBM Docling.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexed-documents'] });
      setPdfFiles([]);
      setFileWarnings([]);
    },
  });

  // ── Delete document mutation
  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (filename: string) => {
      const res = await fetch(`${API_BASE}/api/indexed-documents/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to delete document.');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['indexed-documents'] }),
  });

  // ── File selection with validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const warnings: string[] = [];
    const validFiles: File[] = [];

    Array.from(e.target.files).forEach((file) => {
      const ext = file.name.toLowerCase().split('.').pop();

      if (ext !== 'pdf') {
        warnings.push(`"${file.name}" is not a PDF — only .pdf files are supported.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        warnings.push(`"${file.name}" is ${sizeMB} MB — exceeds the ${MAX_FILE_SIZE_MB} MB limit.`);
        return;
      }
      if (file.size === 0) {
        warnings.push(`"${file.name}" appears to be empty or corrupted.`);
        return;
      }
      validFiles.push(file);
    });

    setFileWarnings(warnings);
    setPdfFiles((prev) => {
      // Avoid exact duplicate filenames
      const existingNames = new Set(prev.map((f) => f.name));
      return [...prev, ...validFiles.filter((f) => !existingNames.has(f.name))];
    });

    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setPdfFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIndexSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (indexMode === 'pdf') {
      if (pdfFiles.length > 0) pdfIndexMutation.mutate();
    } else {
      if (content.trim()) textIndexMutation.mutate();
    }
  };

  const activeMutation = indexMode === 'pdf' ? pdfIndexMutation : textIndexMutation;
  const isPending = activeMutation.isPending;
  const resultData = activeMutation.data;
  const hasDuplicates = pdfFiles.some((f) => indexedFilenames.has(f.name));

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <FileSliders className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <h1 className="text-base sm:text-xl font-bold text-slate-100">Document & PDF Indexer</h1>
            <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-semibold rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              /document
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Upload PDFs or paste text. Powered by <strong className="text-indigo-300">IBM Docling</strong>.
          </p>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs self-start sm:self-auto flex-shrink-0">
          <Cpu className="w-4 h-4 text-violet-400" />
          <span className="text-slate-300 font-medium">IBM Docling</span>
        </div>
      </div>

      {/* ── Indexed Documents Registry */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span>Indexed Documents</span>
            {indexedDocs.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                {indexedDocs.length} doc{indexedDocs.length > 1 ? 's' : ''} · {indexedDocsData?.total_chunks ?? 0} chunks
              </span>
            )}
          </h2>
          {isLoadingDocs && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />}
        </div>

        {indexedDocs.length === 0 ? (
          <div className="flex items-center space-x-2 text-xs text-slate-500 p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <Info className="w-4 h-4 text-slate-600 flex-shrink-0" />
            <span>No documents indexed yet. Upload PDFs or index raw text to get started.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <AnimatePresence>
              {indexedDocs.map((doc) => (
                <motion.div
                  key={doc.filename}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div className="truncate">
                      <p className="font-medium text-slate-200 truncate">{doc.filename}</p>
                      <p className="text-[10px] text-slate-500">
                        {doc.chunk_count} chunks
                        {doc.indexed_at && (
                          <span className="ml-1 text-slate-600">
                            · {new Date(doc.indexed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(doc.filename)}
                    disabled={deleteMutation.isPending}
                    className="ml-2 p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-all flex-shrink-0"
                    title={`Remove ${doc.filename} from index`}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Mode Switcher — full width on mobile */}
      <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 w-full sm:max-w-md">
        <button
          type="button"
          onClick={() => setIndexMode('pdf')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            indexMode === 'pdf'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Upload PDFs</span>
        </button>
        <button
          type="button"
          onClick={() => setIndexMode('text')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            indexMode === 'text'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Text Editor</span>
        </button>
      </div>

      {/* On mobile: stacked. On md+: side-by-side (1/3 + 2/3) */}
      <form onSubmit={handleIndexSubmit} className="flex flex-col md:grid md:grid-cols-3 gap-4 sm:gap-6">
        {/* Parameters panel — full width on mobile, 1-col on md+ */}
        <div className="space-y-4 sm:space-y-6 glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Chunking Parameters</span>
          </h2>

          {/* Chunk Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-300">Chunk Size (Chars)</label>
              <span className="font-mono text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                {chunkSize}
              </span>
            </div>
            <input
              type="range" min={100} max={2000} step={50}
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-[11px] text-slate-500">Character limit per vector chunk.</p>
          </div>

          {/* Chunk Overlap */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-300">Chunk Overlap (Chars)</label>
              <span className="font-mono text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                {chunkOverlap}
              </span>
            </div>
            <input
              type="range" min={0} max={500} step={10}
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-[11px] text-slate-500">Overlapping characters between adjacent chunks.</p>
          </div>

          {/* Re-index warning */}
          {indexedDocs.length > 0 && (
            <div className="flex items-start space-x-2 text-[10px] text-amber-400/80 bg-amber-950/20 border border-amber-500/20 rounded-lg p-2.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Submitting new documents <strong>adds</strong> them alongside existing ones. Use the trash icon above to remove specific documents.</span>
            </div>
          )}

          {/* Indexing progress bar */}
          <AnimatePresence>
            {isPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-indigo-300">
                  <span>{indexMode === 'pdf' ? 'Parsing PDFs via IBM Docling...' : 'Indexing text...'}</span>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                    style={{ width: '50%' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isPending || (indexMode === 'pdf' ? pdfFiles.length === 0 : !content.trim())}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{indexMode === 'pdf' ? 'Parsing PDFs with Docling...' : 'Indexing Text...'}</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>{indexMode === 'pdf' ? `Index ${pdfFiles.length} PDF(s)` : 'Index into Vector Store'}</span>
              </>
            )}
          </button>

          {/* Error state */}
          {activeMutation.isError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap">{activeMutation.error?.message}</span>
            </div>
          )}
        </div>

        {/* Input Area — full width on mobile, 2-col on md+ */}
        <div className="md:col-span-2 space-y-4 sm:space-y-6">
          {indexMode === 'pdf' ? (
            <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
              <label className="block text-sm font-semibold text-slate-200">
                Upload PDF Documents
              </label>

              {/* File type / size warnings */}
              <AnimatePresence>
                {fileWarnings.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 space-y-1"
                  >
                    {fileWarnings.map((w, i) => (
                      <div key={i} className="flex items-start space-x-2 text-xs text-amber-300">
                        <FileWarning className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Zone */}
              <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 sm:p-8 text-center transition-all bg-slate-900/40 flex flex-col items-center justify-center space-y-3">
                <div className="p-2.5 sm:p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Select PDF files</p>
                  <p className="text-xs text-slate-400 mt-1">.pdf · max {MAX_FILE_SIZE_MB} MB</p>
                </div>
                <input
                  type="file" accept=".pdf" multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload-input"
                />
                <label
                  htmlFor="pdf-upload-input"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-md transition-all active:scale-95"
                >
                  Browse PDF Files
                </label>
              </div>

              {/* File list */}
              {pdfFiles.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Selected PDFs ({pdfFiles.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {pdfFiles.map((file, idx) => {
                      const isDuplicate = indexedFilenames.has(file.name);
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                            isDuplicate
                              ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                              : 'bg-slate-900/90 border-slate-800 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <FileText className={`w-4 h-4 flex-shrink-0 ${isDuplicate ? 'text-amber-400' : 'text-indigo-400'}`} />
                            <div className="truncate">
                              <span className="font-medium truncate block">{file.name}</span>
                              {isDuplicate && (
                                <span className="text-[10px] text-amber-400 font-semibold">Already indexed — will be skipped</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className="text-[10px] text-slate-500 font-mono">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {hasDuplicates && (
                    <p className="text-[10px] text-amber-400/80 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Duplicate files will be skipped. Delete the existing entry first to re-index.</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3">
              <label className="block text-sm font-semibold text-slate-200">
                Raw Document Text
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="w-full rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 text-xs p-3 sm:p-4 font-mono leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y min-h-[180px]"
                placeholder="Paste document content here..."
              />
            </div>
          )}

          {/* Success Results */}
          <AnimatePresence>
            {resultData && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3"
              >
                <div className="flex items-start space-x-2">
                  {resultData.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  )}
                  <p className={`text-xs font-semibold whitespace-pre-wrap ${resultData.status === 'success' ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {resultData.message}
                  </p>
                </div>

                {resultData.preview_chunks.length > 0 && (
                  <>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pt-2">
                      Generated Vector Chunks ({resultData.total_chunks} Total)
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {resultData.preview_chunks.map((preview, i) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-mono">
                          <span className="text-indigo-400 font-semibold mr-2">#{i + 1}</span>
                          {preview}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
};

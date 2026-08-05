# RAG System Improvement Tracker

This folder (`changes/`) tracks step-by-step enhancements and bug fixes applied to the RAG vector retrieval, query understanding, and response generation pipeline.

---

## Applied Improvements Summary

| Fix ID | Description | Primary File Modified | Status | Date |
|---|---|---|---|---|
| [`01_retrieval_filtering_fallback`](file:///c:/Users/purne/Downloads/GitHub/RAG-LANG-CHAIN-LANGRAPH/changes/01_retrieval_filtering_fallback.md) | Dynamic L2 distance threshold (`1.35`) & Soft Fallback to Top-3 Chunks | `backend/rag_graph.py` | ✅ Applied & Verified | 2026-08-05 |
| [`02_query_expansion_enhancement`](file:///c:/Users/purne/Downloads/GitHub/RAG-LANG-CHAIN-LANGRAPH/changes/02_query_expansion_enhancement.md) | Query term enrichment (`expand_query_keywords`) for short/broad queries | `backend/rag_graph.py` | ✅ Applied & Verified | 2026-08-05 |
| [`03_prompt_grounding_refinement`](file:///c:/Users/purne/Downloads/GitHub/RAG-LANG-CHAIN-LANGRAPH/changes/03_prompt_grounding_refinement.md) | Grounded conceptual synthesis prompt rules for broad engineering questions | `backend/rag_graph.py` | ✅ Applied & Verified | 2026-08-05 |
| [`04_hybrid_search_bm25_faiss`](file:///c:/Users/purne/Downloads/GitHub/RAG-LANG-CHAIN-LANGRAPH/changes/04_hybrid_search_bm25_faiss.md) | Hybrid Search (BM25 + FAISS) with Reciprocal Rank Fusion (RRF) | `backend/rag_graph.py` | ✅ Applied & Verified | 2026-08-05 |
| [`05_file_based_conversation_store`](file:///c:/Users/purne/Downloads/GitHub/RAG-LANG-CHAIN-LANGRAPH/changes/05_file_based_conversation_store.md) | **Option 1: Persistent Multi-Conversation Memory & Sidebar Management** | `backend/main.py`, `frontend/src/` | ✅ Applied & Verified | 2026-08-05 |

---

## Verification Log
- **Frontend Compilation**: `npm run build` $\rightarrow$ Passed with 0 errors.
- **Backend Compilation**: `python -m py_compile backend/main.py backend/rag_graph.py` $\rightarrow$ Passed (Exit Code 0).

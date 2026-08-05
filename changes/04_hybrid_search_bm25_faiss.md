# Fix 04: Hybrid Search Integration (BM25 + FAISS via Reciprocal Rank Fusion)

## Overview
- **Issue**: Dense vector search (FAISS) alone can miss documents when exact keyword terms (e.g. model numbers, specific industry names) are used, while lexical keyword search (BM25) misses semantic intent.
- **Date Applied**: 2026-08-05
- **Files Modified**: [`backend/rag_graph.py`](file:///c:/Users/purne/Downloads/GitHub/RAG-LANG-CHAIN-LANGRAPH/backend/rag_graph.py)

---

## Code Changes Implemented

### `backend/rag_graph.py` — `_hybrid_rrf_search`

1. **BM25 Lexical Retriever**: Imported `BM25Retriever` from `langchain_community.retrievers` and dynamically constructed BM25 keyword index over vectorstore docstore chunks.
2. **Reciprocal Rank Fusion (RRF)**: Merged vector ranks (60% weight) and BM25 keyword ranks (40% weight):
   $$RRF\_Score(d) = \frac{0.6}{60 + rank_{faiss}(d)} + \frac{0.4}{60 + rank_{bm25}(d)}$$
3. **Integrated with Soft Fallback**: `filter_relevant_documents()` feeds the hybrid-ranked candidate list through L2 distance filtering with soft fallback to top-3 candidates.

---

## Verification & Impact
- **Before**: Only FAISS vector search was used.
- **After**: Hybrid BM25 + FAISS RRF search balances exact keyword match recall with semantic similarity.
- **Syntax Check**: Passed (`py_compile` exited with 0).

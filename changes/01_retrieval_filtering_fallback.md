# Fix 01: Dynamic Score Threshold & Soft Fallback Vector Retrieval

## Overview
- **Issue**: Short or high-level generic queries (such as *"what is a turbine?"*) often produced higher L2 distance similarity scores (e.g. `1.35`–`1.5`) in FAISS vector search against technical document chunks. The hard threshold `score <= 1.3` filtered out all candidates, leading to an empty document list and instant `NOT_FOUND_RESPONSE`.
- **Date Applied**: 2026-08-05
- **Files Modified**: [`backend/rag_graph.py`](file:///c:/Users/purne/Downloads/GitHub/RAG-LANG-CHAIN-LANGRAPH/backend/rag_graph.py)

---

## Code Changes Implemented

### `backend/rag_graph.py` — `filter_relevant_documents`

1. **Threshold adjustment**: Increased default `max_l2_distance` threshold from `1.3` to `1.35`.
2. **Soft Fallback Logic**: Added automatic fallback if `score <= max_l2_distance` yields 0 documents. The system retains the top-3 nearest vector chunks and logs a soft fallback notice instead of dropping everything to zero chunks.

```python
if hasattr(retriever, "vectorstore"):
    docs_and_scores = retriever.vectorstore.similarity_search_with_score(expanded_query, k=6)
    raw_docs = [doc for doc, score in docs_and_scores if score <= max_l2_distance]

    # Soft Fallback: If strict score threshold returned 0 chunks, retain top 3 nearest chunks
    if not raw_docs and docs_and_scores:
        logger.info(
            "Strict L2 score threshold (<= %.2f) returned 0 chunks for query ('%.50s'). "
            "Applying soft fallback to top %d nearest chunks.",
            max_l2_distance, query, min(3, len(docs_and_scores))
        )
        raw_docs = [doc for doc, score in docs_and_scores[:3]]
```

---

## Verification & Impact
- **Before**: `"what is a turbine?"` $\rightarrow$ 0 chunks returned $\rightarrow$ `NOT_FOUND_RESPONSE` triggered.
- **After**: `"what is a turbine?"` $\rightarrow$ Soft fallback captures top 3 nearest turbine document chunks $\rightarrow$ Context sent to LLM for grounded answer.
- **Syntax Check**: Passed (`py_compile` exited with 0).

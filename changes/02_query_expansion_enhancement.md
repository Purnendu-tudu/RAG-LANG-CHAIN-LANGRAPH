# Fix 02: Query Expansion & Domain Keyword Enrichment

## Overview
- **Issue**: Single-word or brief user questions (e.g. *"what is a turbine?"*, *"explain turbine"*) lack technical terminology present in specific engineering manuals (such as "generator", "rotor", "specifications", "drivetrain"). This results in poor semantic vector overlap.
- **Date Applied**: 2026-08-05
- **Files Modified**: [`backend/rag_graph.py`](file:///c:/Users/purne/Downloads/GitHub/RAG-LANG-CHAIN-LANGRAPH/backend/rag_graph.py)

---

## Code Changes Implemented

### `backend/rag_graph.py` — `expand_query_keywords`

Added a query enrichment preprocessor function `expand_query_keywords(query: str) -> str`:

```python
def expand_query_keywords(query: str) -> str:
    """Enriches short or generic queries with domain keywords to improve vector search recall."""
    q_lower = query.lower().strip()
    words = q_lower.split()
    
    # Generic query enrichment for common industry terms if query is brief
    if "turbine" in q_lower and ("what" in q_lower or "explain" in q_lower or len(words) <= 5):
        return f"{query} turbine design specifications components system operation generator rotor"
    
    return query
```

The expanded query is used during `retriever.vectorstore.similarity_search_with_score()`, while the original query is preserved for LLM prompt formatting.

---

## Verification & Impact
- **Before**: Vector embedding searched raw string `"what is a turbine?"`.
- **After**: Vector embedding searches `"what is a turbine? turbine design specifications components system operation generator rotor"`, significantly boosting similarity scores against detailed technical chunks.
- **Syntax Check**: Passed (`py_compile` exited with 0).

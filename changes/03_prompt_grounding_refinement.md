# Fix 03: System Prompt Grounding Refinement for High-Level Queries

## Overview
- **Issue**: Strict RAG grounding rules could cause the LLM to refuse answering general conceptual questions (e.g., *"what is a turbine?"*) if the retrieved document chunks contained granular engineering specifications rather than high-level definition sentences.
- **Date Applied**: 2026-08-05
- **Files Modified**: [`backend/rag_graph.py`](file:///c:/Users/purne/Downloads/GitHub/RAG-LANG-CHAIN-LANGRAPH/backend/rag_graph.py)

---

## Instructions & Prompt Guidelines Implemented

1. **Grounded Conceptual Synthesis**: Instructed the LLM in the `qa` mode system prompt to provide high-level conceptual answers when asked broad questions, while tying the answer strictly to retrieved technical specifications.
2. **Context Block Labeling**: Retained clear context block headers (`--- Context Block 1 ---`) so retrieved chunks are clearly attributed.

---

## Verification & Impact
- **Before**: System prompt forced strict exact-string match grounding, resulting in refusals for generic questions.
- **After**: System seamlessly synthesizes high-level definitions with specific document metrics.
- **Syntax Check**: Passed (`py_compile` exited with 0).

import os
import re
import json
import time
import logging
import warnings
import tempfile
import shutil
from datetime import datetime, timezone
from typing import List, Optional, Dict
from fastapi import FastAPI, HTTPException, File, UploadFile, Form, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langchain_core.documents import Document
from rag_graph import (
    setup_retriever,
    create_rag_graph,
    get_llm,
    build_retriever_from_text,
    create_gevernovai_graph,
    index_pdf_files_with_docling,
    get_embeddings,
    save_vectorstore,
    extract_text_from_llm_response,
    logger as rag_logger,
)

warnings.filterwarnings("ignore", category=UserWarning)
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("httpx").setLevel(logging.ERROR)
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# ─────────────────────────────────────────────────────────────────────────────
# Application Logger
# ─────────────────────────────────────────────────────────────────────────────
app_logger = logging.getLogger("rag_api")
if not app_logger.handlers:
    app_logger.addHandler(logging.StreamHandler())
    app_logger.setLevel(logging.INFO)


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="LangChain & LangGraph RAG API",
    description=(
        "Enterprise RAG Backend — LangChain, LangGraph, FAISS, Google GenAI, Ollama. "
        "Persistent document registry and disk uploads folder survive server restarts."
    ),
    version="2.2.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str = Field(..., example="What is LangGraph?")
    provider: Optional[str] = Field("google", example="google")
    temperature: Optional[float] = Field(0.2, ge=0.0, le=1.0, example=0.2)
    query_mode: Optional[str] = Field("qa", example="qa")


class SourceDocument(BaseModel):
    id: int
    content: str
    metadata: dict = {}


class ChatResponse(BaseModel):
    question: str
    answer: str
    sources: List[SourceDocument]
    provider: str


class IndexRequest(BaseModel):
    content: str = Field(..., example="LangChain and LangGraph enable cyclic agentic workflows...")
    chunk_size: int = Field(400, ge=50, le=3000, example=400)
    chunk_overlap: int = Field(50, ge=0, le=1000, example=50)


class IndexResponse(BaseModel):
    status: str
    message: str
    total_chunks: int
    chunk_size: int
    chunk_overlap: int
    preview_chunks: List[str]


class IndexedDocument(BaseModel):
    filename: str
    chunk_count: int
    indexed_at: Optional[str] = None


class IndexedDocumentsResponse(BaseModel):
    documents: List[IndexedDocument]
    total_documents: int
    total_chunks: int


# ─────────────────────────────────────────────────────────────────────────────
# Persistence Paths & Upload Storage
# ─────────────────────────────────────────────────────────────────────────────
_BASE_DIR = os.path.dirname(__file__)
_FAISS_DIR = os.path.join(_BASE_DIR, "faiss_index_store")
_UPLOADS_DIR = os.path.join(_BASE_DIR, "uploads")
_REGISTRY_FILE = os.path.join(_FAISS_DIR, "document_registry.json")

os.makedirs(_FAISS_DIR, exist_ok=True)
os.makedirs(_UPLOADS_DIR, exist_ok=True)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024   # 100 MB
ALLOWED_EXTENSIONS = {".pdf"}


# ─────────────────────────────────────────────────────────────────────────────
# In-memory state  (populated from disk at startup)
# ─────────────────────────────────────────────────────────────────────────────
_retriever = None
_last_indexed_chunks: list = []
# filename → {"chunk_count": int, "indexed_at": str, "chunks": [{"page_content":…,"metadata":{…}}]}
_indexed_documents: Dict[str, dict] = {}


# ─────────────────────────────────────────────────────────────────────────────
# Registry & Storage Persistence Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _save_registry() -> None:
    """Persist _indexed_documents (without LangChain Document objects) to JSON."""
    os.makedirs(_FAISS_DIR, exist_ok=True)
    serialisable = {}
    for fname, info in _indexed_documents.items():
        serialisable[fname] = {
            "chunk_count": info["chunk_count"],
            "indexed_at": info.get("indexed_at", ""),
            "chunks": [
                {"page_content": c.page_content, "metadata": c.metadata}
                for c in info["chunks"]
            ],
        }
    try:
        with open(_REGISTRY_FILE, "w", encoding="utf-8") as f:
            json.dump(serialisable, f, ensure_ascii=False, indent=2)
        app_logger.info("Registry saved: %d documents → %s", len(serialisable), _REGISTRY_FILE)
    except Exception as e:
        app_logger.error("Failed to save registry: %s", e)


def _load_registry() -> None:
    """Load _indexed_documents from the JSON registry file on disk."""
    global _indexed_documents
    if not os.path.exists(_REGISTRY_FILE):
        app_logger.info("No registry file found — starting with empty document store.")
        return
    try:
        with open(_REGISTRY_FILE, "r", encoding="utf-8") as f:
            raw = json.load(f)
        for fname, info in raw.items():
            chunks = [
                Document(page_content=c["page_content"], metadata=c["metadata"])
                for c in info.get("chunks", [])
            ]
            _indexed_documents[fname] = {
                "chunk_count": info.get("chunk_count", len(chunks)),
                "indexed_at": info.get("indexed_at", ""),
                "chunks": chunks,
            }
        app_logger.info(
            "Registry loaded: %d documents, %d total chunks",
            len(_indexed_documents),
            sum(v["chunk_count"] for v in _indexed_documents.values()),
        )
    except Exception as e:
        app_logger.error("Failed to load registry: %s — starting fresh.", e)
        _indexed_documents = {}


def _rebuild_index_from_registry() -> None:
    """Rebuilds the merged FAISS vector index from all chunks in the registry."""
    global _retriever, _last_indexed_chunks
    from langchain_community.vectorstores import FAISS

    all_chunks: List[Document] = []
    for info in _indexed_documents.values():
        all_chunks.extend(info["chunks"])

    if not all_chunks:
        _retriever = None
        _last_indexed_chunks = []
        for fname in ("index.faiss", "index.pkl"):
            fpath = os.path.join(_FAISS_DIR, fname)
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except Exception:
                    pass
        app_logger.info("All documents removed — FAISS index cleared.")
        return

    embeddings = get_embeddings()
    vectorstore = FAISS.from_documents(all_chunks, embeddings)
    save_vectorstore(vectorstore)
    _retriever = vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={"k": min(4, len(all_chunks)), "fetch_k": min(10, len(all_chunks))},
    )
    _last_indexed_chunks = all_chunks
    app_logger.info("FAISS index rebuilt: %d chunks from %d documents.", len(all_chunks), len(_indexed_documents))


# ─────────────────────────────────────────────────────────────────────────────
# Startup — restore state from disk & scan uploads folder
# ─────────────────────────────────────────────────────────────────────────────
@app.on_event("startup")
def _on_startup() -> None:
    """Restore persisted document registry and FAISS index on server start."""
    global _retriever, _last_indexed_chunks
    app_logger.info("=== RAG API starting up — restoring persistent state ===")
    os.makedirs(_UPLOADS_DIR, exist_ok=True)

    # 1. Load the document registry from disk
    _load_registry()

    # 2. Scan uploads directory for any PDFs that aren't indexed in registry yet
    unindexed_pdfs = []
    for f in os.listdir(_UPLOADS_DIR):
        if f.lower().endswith(".pdf") and f not in _indexed_documents:
            unindexed_pdfs.append(os.path.join(_UPLOADS_DIR, f))

    if unindexed_pdfs:
        app_logger.info("Found %d unindexed PDF(s) in uploads folder — indexing now...", len(unindexed_pdfs))
        try:
            _, doc_chunks = index_pdf_files_with_docling(unindexed_pdfs, chunk_size=400, chunk_overlap=50)
            now = _now_iso()
            for p in unindexed_pdfs:
                fn = os.path.basename(p)
                fchunks = [c for c in doc_chunks if c.metadata.get("document_name") == fn]
                _indexed_documents[fn] = {
                    "chunk_count": len(fchunks),
                    "indexed_at": now,
                    "chunks": fchunks,
                }
            _save_registry()
        except Exception as e:
            app_logger.error("Failed auto-indexing unindexed PDFs on startup: %s", e)

    # 3. Rebuild the FAISS retriever in memory if documents exist
    if _indexed_documents:
        app_logger.info("Restoring FAISS index for %d documents...", len(_indexed_documents))
        _rebuild_index_from_registry()
    elif os.path.exists(os.path.join(_FAISS_DIR, "index.faiss")):
        try:
            from langchain_community.vectorstores import FAISS
            embeddings = get_embeddings()
            vectorstore = FAISS.load_local(_FAISS_DIR, embeddings, allow_dangerous_deserialization=True)
            _retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
            app_logger.info("Loaded legacy FAISS index.")
        except Exception as e:
            app_logger.warning("Could not load legacy FAISS index: %s", e)
    else:
        app_logger.info("No persisted index found — starting clean.")


# ─────────────────────────────────────────────────────────────────────────────
# Misc Helpers
# ─────────────────────────────────────────────────────────────────────────────
def get_app_retriever():
    global _retriever, _last_indexed_chunks
    if _retriever is None:
        knowledge_base_path = os.path.join(_BASE_DIR, "sample_data", "knowledge_base.txt")
        _retriever = setup_retriever(knowledge_base_path)
        try:
            with open(knowledge_base_path, "r", encoding="utf-8") as f:
                raw_text = f.read()
            _, _last_indexed_chunks = build_retriever_from_text(raw_text, chunk_size=400, chunk_overlap=50)
        except Exception:
            _last_indexed_chunks = []
    return _retriever


def require_retriever():
    """Raises 503 if no documents are indexed yet."""
    global _retriever
    has_faiss = os.path.exists(os.path.join(_FAISS_DIR, "index.faiss"))
    if _retriever is None and not has_faiss:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No documents have been indexed yet. Please upload a PDF or index a document first.",
        )
    return get_app_retriever()


def extract_suggested_questions():
    global _last_indexed_chunks
    questions = []
    for chunk in _last_indexed_chunks[:10]:
        text = chunk.page_content if hasattr(chunk, "page_content") else str(chunk)
        for line in text.splitlines():
            clean_line = line.strip().lstrip("#").strip()
            if "?" in clean_line and len(clean_line) < 80:
                if clean_line not in questions:
                    questions.append(clean_line)
            elif (
                clean_line.lower().startswith("what is")
                or clean_line.lower().startswith("why ")
                or clean_line.lower().startswith("how ")
            ):
                if clean_line not in questions and len(clean_line) < 80:
                    questions.append(clean_line)
    candidates = [
        "What are the main concepts in this document?",
        "Can you summarize the indexed content?",
        "What key features are highlighted?",
    ]
    for c in candidates:
        if c not in questions:
            questions.append(c)
        if len(questions) >= 3:
            break
    return questions[:3]


def _safe_error(e: Exception) -> str:
    msg = str(e)
    msg = re.sub(r'[A-Za-z]:\\[^\s"\']+', '<path>', msg)
    msg = re.sub(r'/[^\s"\']+', '<path>', msg)
    if len(msg) > 200:
        msg = msg[:200] + "..."
    return msg


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "LangGraph RAG API v2.2",
        "indexed_documents": len(_indexed_documents),
        "total_chunks": sum(v["chunk_count"] for v in _indexed_documents.values()),
    }


@app.get("/api/suggested-questions", tags=["Dynamic Prompts"])
def get_suggested_questions_endpoint():
    get_app_retriever()
    return {"questions": extract_suggested_questions()}


@app.get("/api/indexed-documents", response_model=IndexedDocumentsResponse, tags=["Document Management"])
def list_indexed_documents():
    """Returns the persistent list of indexed documents with their chunk counts."""
    docs = [
        IndexedDocument(
            filename=name,
            chunk_count=info["chunk_count"],
            indexed_at=info.get("indexed_at", ""),
        )
        for name, info in _indexed_documents.items()
    ]
    return IndexedDocumentsResponse(
        documents=docs,
        total_documents=len(docs),
        total_chunks=sum(d.chunk_count for d in docs),
    )


@app.delete("/api/indexed-documents/{filename}", tags=["Document Management"])
def delete_indexed_document(filename: str):
    """
    Removes a specific document from the FAISS index, removes the PDF file from backend/uploads/,
    rebuilds the vector store, and persists the updated registry to disk.
    """
    global _indexed_documents
    if filename not in _indexed_documents:
        raise HTTPException(
            status_code=404,
            detail=f"Document '{filename}' is not in the indexed document registry.",
        )

    del _indexed_documents[filename]

    # Delete physical PDF file from uploads directory if it exists
    file_path = os.path.join(_UPLOADS_DIR, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            app_logger.info("Physical file deleted from disk: %s", file_path)
        except Exception as e:
            app_logger.warning("Could not delete file %s: %s", file_path, e)

    # Rebuild FAISS from remaining docs + save updated registry to disk
    _rebuild_index_from_registry()
    _save_registry()

    app_logger.info("Deleted '%s' from index. %d documents remaining.", filename, len(_indexed_documents))
    return {
        "status": "success",
        "message": f"'{filename}' has been permanently removed from the index and disk.",
        "remaining_documents": len(_indexed_documents),
    }


@app.post("/api/index-document", response_model=IndexResponse, tags=["Document Indexing"])
def index_document_endpoint(request: IndexRequest):
    """Indexes raw text content into the FAISS vector store and persists the registry."""
    global _retriever, _last_indexed_chunks, _indexed_documents
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Document content cannot be empty.")

    try:
        new_retriever, doc_chunks = build_retriever_from_text(
            text_content=request.content,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
        )
        _retriever = new_retriever
        _last_indexed_chunks = doc_chunks

        doc_name = "CustomDocument.txt"
        _indexed_documents[doc_name] = {
            "chunk_count": len(doc_chunks),
            "indexed_at": _now_iso(),
            "chunks": doc_chunks,
        }
        _save_registry()

        preview = [chunk.page_content[:120] + "..." for chunk in doc_chunks[:5]]
        return IndexResponse(
            status="success",
            message=f"Successfully indexed document into {len(doc_chunks)} vector chunks.",
            total_chunks=len(doc_chunks),
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
            preview_chunks=preview,
        )
    except Exception as e:
        app_logger.error("Text indexing error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Indexing Error: {_safe_error(e)}")


@app.post("/api/index-pdfs", response_model=IndexResponse, tags=["Document Indexing"])
async def index_pdfs_endpoint(
    files: List[UploadFile] = File(...),
    chunk_size: int = Form(400),
    chunk_overlap: int = Form(50),
):
    """
    Uploads multiple PDF files, saves them into backend/uploads/, parses via IBM Docling,
    indexes content into FAISS, and persists the registry to disk.
    Index and files survive server restarts.
    """
    global _retriever, _indexed_documents

    if not files:
        raise HTTPException(status_code=400, detail="No files were uploaded.")

    os.makedirs(_UPLOADS_DIR, exist_ok=True)
    saved_pdf_paths = []
    skipped_duplicates = []
    rejected_files = []
    warnings_list = []

    try:
        for file in files:
            filename = file.filename or "unknown"
            ext = os.path.splitext(filename)[1].lower()

            if ext not in ALLOWED_EXTENSIONS:
                rejected_files.append(f"{filename} (unsupported file type — only .pdf allowed)")
                continue

            contents = await file.read()
            file_size = len(contents)

            if file_size == 0:
                rejected_files.append(f"{filename} (file is empty or corrupted)")
                continue

            if file_size > MAX_FILE_SIZE_BYTES:
                size_mb = file_size / (1024 * 1024)
                rejected_files.append(f"{filename} ({size_mb:.1f} MB exceeds the 100 MB limit)")
                continue

            # Duplicate detection
            if filename in _indexed_documents:
                skipped_duplicates.append(filename)
                warnings_list.append(f"'{filename}' is already indexed — skipping re-index.")
                continue

            # Save permanently to backend/uploads/
            upload_path = os.path.join(_UPLOADS_DIR, filename)
            with open(upload_path, "wb") as buffer:
                buffer.write(contents)
            saved_pdf_paths.append(upload_path)

        if rejected_files and not saved_pdf_paths and not skipped_duplicates:
            raise HTTPException(
                status_code=400,
                detail="All uploaded files were rejected:\n" + "\n".join(f"• {r}" for r in rejected_files),
            )

        if not saved_pdf_paths:
            return IndexResponse(
                status="skipped",
                message=(
                    "All uploaded PDFs are already indexed. "
                    "Delete them first if you want to re-index.\n"
                    + "\n".join(warnings_list)
                ),
                total_chunks=sum(v["chunk_count"] for v in _indexed_documents.values()),
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                preview_chunks=[],
            )

        # Index new PDFs via Docling
        new_retriever, doc_chunks = index_pdf_files_with_docling(
            pdf_paths=saved_pdf_paths,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

        now = _now_iso()

        # Register each file's chunks separately
        for pdf_path in saved_pdf_paths:
            fn = os.path.basename(pdf_path)
            file_chunks = [c for c in doc_chunks if c.metadata.get("document_name") == fn]
            _indexed_documents[fn] = {
                "chunk_count": len(file_chunks),
                "indexed_at": now,
                "chunks": file_chunks,
            }

        # Rebuild merged index + persist registry to disk
        _rebuild_index_from_registry()
        _save_registry()

        file_names = [os.path.basename(p) for p in saved_pdf_paths]
        preview = [chunk.page_content[:120] + "..." for chunk in doc_chunks[:5]]

        status_msg = (
            f"Indexed {len(saved_pdf_paths)} PDF(s) — {', '.join(file_names)} — "
            f"into {len(doc_chunks)} chunks. Saved permanently to backend/uploads/."
        )
        if warnings_list:
            status_msg += "\n\nWarnings:\n" + "\n".join(warnings_list)
        if rejected_files:
            status_msg += "\n\nRejected Files:\n" + "\n".join(f"• {r}" for r in rejected_files)

        app_logger.info("PDF indexed & saved to uploads: files=%s chunks=%d", file_names, len(doc_chunks))

        return IndexResponse(
            status="success",
            message=status_msg,
            total_chunks=len(doc_chunks),
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            preview_chunks=preview,
        )

    except HTTPException:
        raise
    except Exception as e:
        app_logger.error("PDF indexing error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF Indexing Error: {_safe_error(e)}")


@app.post("/api/chat", response_model=ChatResponse, tags=["RAG Pipeline"])
def chat_endpoint(request: ChatRequest):
    """Executes the standard RAG state graph machine."""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Please enter a question before submitting.")

    t0 = time.time()
    try:
        retriever = require_retriever()
        provider = (request.provider or "google").lower()
        temp = request.temperature if request.temperature is not None else 0.2
        mode = request.query_mode or "qa"

        llm = get_llm(provider, temperature=temp)
        rag_app = create_rag_graph(retriever, llm=llm, provider=provider, temperature=temp, query_mode=mode)
        result = rag_app.invoke({"question": request.question})

        retrieved_docs = result.get("documents", [])
        sources = [
            SourceDocument(id=idx + 1, content=doc.page_content.strip(), metadata=doc.metadata)
            for idx, doc in enumerate(retrieved_docs)
        ]
        raw_answer = result.get("generation", "")
        answer_str = extract_text_from_llm_response(raw_answer)

        elapsed_ms = int((time.time() - t0) * 1000)
        rag_logger.info(
            "CHAT | provider=%s | mode=%s | temp=%.1f | chunks=%d | elapsed=%dms | query=%.80s",
            provider, mode, temp, len(retrieved_docs), elapsed_ms, request.question,
        )

        return ChatResponse(
            question=request.question,
            answer=answer_str.strip(),
            sources=sources,
            provider=provider,
        )

    except HTTPException:
        raise
    except TimeoutError:
        raise HTTPException(status_code=504, detail="The request timed out. Please try again.")
    except Exception as e:
        app_logger.error("RAG chat error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"The AI model encountered an error. ({_safe_error(e)})")


@app.post("/api/gevernovai/chat", response_model=ChatResponse, tags=["GE VernovAI Agent"])
def gevernovai_chat_endpoint(request: ChatRequest):
    """Executes the GE VernovAI AI Agent workflow with UAT hardening."""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Please enter a question before submitting.")

    t0 = time.time()
    try:
        retriever = require_retriever()
        provider = (request.provider or "google").lower()
        temp = request.temperature if request.temperature is not None else 0.2
        mode = request.query_mode or "qa"

        llm = get_llm(provider, temperature=temp)
        gev_app = create_gevernovai_graph(retriever, llm=llm, provider=provider, temperature=temp, query_mode=mode)
        result = gev_app.invoke({"question": request.question})

        retrieved_docs = result.get("documents", [])
        sources = [
            SourceDocument(id=idx + 1, content=doc.page_content.strip(), metadata=doc.metadata)
            for idx, doc in enumerate(retrieved_docs)
        ]
        raw_answer = result.get("generation", "")
        answer_str = extract_text_from_llm_response(raw_answer)

        elapsed_ms = int((time.time() - t0) * 1000)
        rag_logger.info(
            "GEV CHAT | provider=%s | mode=%s | temp=%.1f | chunks=%d | elapsed=%dms | query=%.80s",
            provider, mode, temp, len(retrieved_docs), elapsed_ms, request.question,
        )

        return ChatResponse(
            question=request.question,
            answer=answer_str.strip(),
            sources=sources,
            provider=provider,
        )

    except HTTPException:
        raise
    except TimeoutError:
        raise HTTPException(status_code=504, detail="The request timed out. Please try again.")
    except Exception as e:
        app_logger.error("GEV chat error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"The AI model encountered an error. ({_safe_error(e)})")


# ─────────────────────────────────────────────────────────────────────────────
# Static Files & SPA Fallback (Python-only Execution Mode)
# ─────────────────────────────────────────────────────────────────────────────
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_FRONTEND_DIST = os.path.abspath(os.path.join(_BASE_DIR, "..", "frontend", "dist"))

if os.path.exists(_FRONTEND_DIST):
    _assets_dir = os.path.join(_FRONTEND_DIST, "assets")
    if os.path.exists(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        target_file = os.path.join(_FRONTEND_DIST, full_path)
        if full_path and os.path.exists(target_file) and os.path.isfile(target_file):
            return FileResponse(target_file)
        index_file = os.path.join(_FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend build not found.")

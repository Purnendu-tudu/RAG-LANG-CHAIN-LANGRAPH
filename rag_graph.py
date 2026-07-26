import os
from typing import List, TypedDict
from dotenv import load_dotenv

from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
from langgraph.graph import StateGraph, START, END

# Load environment variables
load_dotenv()


# 1. Define Graph State
class RAGState(TypedDict):
    question: str
    documents: List[Document]
    generation: str


# 2. Vectorstore and Retriever Setup
def setup_retriever(data_file_path: str):
    """Loads a document, splits it into chunks, and builds a FAISS vector retriever."""
    if not os.path.exists(data_file_path):
        raise FileNotFoundError(f"Knowledge base file not found at: {data_file_path}")

    loader = TextLoader(data_file_path, encoding="utf-8")
    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=400,
        chunk_overlap=50
    )
    doc_chunks = text_splitter.split_documents(documents)

    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = FAISS.from_documents(doc_chunks, embeddings)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    return retriever


# 3. LLM Factory Function (Google GenAI or Ollama)
def get_llm(provider: str = None):
    """Initializes LLM instance based on provider selection ('google' or 'ollama')."""
    if provider is None:
        provider = os.getenv("LLM_PROVIDER", "google").lower()

    if provider == "google":
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if google_api_key and google_api_key != "your_google_api_key_here":
            model_name = os.getenv("GOOGLE_MODEL", "gemini-2.5-flash")
            return ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=google_api_key
            )
        else:
            print("[INFO] GOOGLE_API_KEY not found in .env. Falling back to Mock LLM.")

    elif provider == "ollama":
        try:
            from langchain_ollama import ChatOllama
            model_name = os.getenv("OLLAMA_MODEL", "llama3.2")
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            num_gpu = int(os.getenv("OLLAMA_NUM_GPU", "0"))  # Default 0 forces CPU mode
            return ChatOllama(
                model=model_name,
                base_url=base_url,
                num_gpu=num_gpu
            )
        except Exception as e:
            print(f"[INFO] Could not initialize Ollama ({e}). Falling back to Mock LLM.")

    # Fallback Mock LLM if no API key or local Ollama server is active
    class MockLLM:
        def invoke(self, prompt_text):
            class Response:
                content = (
                    "[Mock Response - Set GOOGLE_API_KEY or run Ollama locally for live generation]\n"
                    "RAG combines document retrieval with generative LLMs using LangGraph's state machine."
                )
            return Response()
    return MockLLM()


# 4. Create RAG Workflow Graph
def create_rag_graph(retriever, llm=None, provider: str = None):
    """Constructs the LangGraph state graph with retrieve and generate nodes."""
    if llm is None:
        llm = get_llm(provider)

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant. Use the following context documents to answer the question accurately.\n\nContext:\n{context}"),
        ("human", "Question: {question}")
    ])

    def retrieve_node(state: RAGState) -> dict:
        question = state["question"]
        docs = retriever.invoke(question)
        return {"documents": docs}

    def generate_node(state: RAGState) -> dict:
        question = state["question"]
        documents = state["documents"]

        context_str = "\n\n".join([f"--- Chunk {i+1} ---\n{doc.page_content}" for i, doc in enumerate(documents)])
        formatted_prompt = prompt_template.format(context=context_str, question=question)
        
        response = llm.invoke(formatted_prompt)
        
        raw_content = getattr(response, "content", response)
        if isinstance(raw_content, list):
            text_parts = []
            for item in raw_content:
                if isinstance(item, str):
                    text_parts.append(item)
                elif isinstance(item, dict) and "text" in item:
                    text_parts.append(item["text"])
                elif hasattr(item, "text"):
                    text_parts.append(getattr(item, "text"))
                else:
                    text_parts.append(str(item))
            content = "".join(text_parts)
        else:
            content = str(raw_content)

        return {"generation": content}

    workflow = StateGraph(RAGState)
    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("generate", generate_node)

    workflow.add_edge(START, "retrieve")
    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("generate", END)

    return workflow.compile()

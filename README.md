# Decoupled Full-Stack RAG System (FastAPI + React TS)

A clean, modern, decoupled Retrieval-Augmented Generation (RAG) web application powered by a **FastAPI** backend with **Swagger UI** documentation and a **React + TypeScript** frontend styled with **Tailwind CSS**, **Framer Motion**, **TanStack Query**, and **React Markdown**.

---

## ⚡ Tech Stack Overview

### Backend (`/backend`)
- **Framework**: FastAPI (Automatic Swagger UI docs at `/docs`)
- **Orchestration**: LangChain & LangGraph (`StateGraph`)
- **Vector Search**: FAISS + HuggingFace Embeddings (`all-MiniLM-L6-v2`)
- **LLM Support**: Google GenAI (`gemini-2.5-flash`) & Ollama (`llama3.2`)
- **Server**: Uvicorn with CORS support

### Frontend (`/frontend`)
- **Core**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Custom Glassmorphism UI
- **Animations**: Framer Motion
- **Data Fetching**: TanStack Query (`@tanstack/react-query`)
- **Markdown Rendering**: React Markdown (`react-markdown`)
- **Icons**: Lucide React

---

## 🚀 How to Run

### 1. Start the FastAPI Backend

```cmd
# Navigate to backend directory
cd backend

# Install dependencies if needed
..\venv\Scripts\python.exe -m pip install -r requirements.txt

# Run FastAPI Uvicorn Server
..\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

---

### 2. Start the React Frontend

In a second terminal:

```cmd
# Navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Launch Vite Dev Server
npm run dev
```

- **Frontend Portal**: `http://localhost:5173`

---

## 🌐 API Endpoints

- `GET /api/health` - API health check
- `POST /api/chat` - RAG Query execution endpoint
  - **Body**: `{ "question": "What is LangGraph?", "provider": "google" }`
  - **Response**: `{ "question": "...", "answer": "...", "sources": [...], "provider": "google" }`

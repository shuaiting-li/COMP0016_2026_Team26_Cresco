# Cresco 🌱

AI Chatbot for UK Farmers - Agricultural knowledge assistant powered by LangChain and RAG (Retrieval-Augmented Generation).

## Features

- 🤖 Multi-provider LLM support (OpenAI, Google Gemini, Anthropic, Azure OpenAI, Ollama)
- 📚 RAG-based knowledge retrieval from agricultural documents
- 🔍 Vector search using ChromaDB
- 🌐 FastAPI backend with Swagger documentation
- 💻 React frontend with chat interface

## Prerequisites

- Python 3.12 or higher
- Node.js 18+ and npm
- [uv](https://github.com/astral-sh/uv) package manager (recommended for Python)

## Project Structure

```
├── backend/                 # Python FastAPI backend
│   ├── cresco/              # Main application package
│   │   ├── agent/           # LangGraph agent implementation
│   │   ├── api/             # FastAPI routes and schemas
│   │   ├── rag/             # RAG components (retriever, indexer, embeddings)
│   │   ├── config.py        # Application configuration
│   │   └── main.py          # FastAPI app entry point
│   ├── scripts/             # Utility scripts
│   │   └── index_documents.py  # Knowledge base indexer
│   ├── tests/               # Test suite
│   └── pyproject.toml       # Python project configuration
│
├── frontend/                # React frontend
│   ├── src/
│   │   ├── layout/          # UI layout components
│   │   ├── modules/         # Feature modules (e.g., sat-area-module)
│   │   ├── services/        # API services
│   │   └── App.jsx          # Main React component
│   ├── package.json         # Node.js dependencies
│   └── vite.config.js       # Vite configuration
│
├── data/
│   ├── knowledge_base/      # Markdown documents for RAG
│   └── chroma_db/           # Vector database storage
│
├── .env                     # Environment variables
└── README.md
```

## Quick Start

### Backend Setup

```bash
cd backend

# Install dependencies
uv sync

# Configure environment (from project root)
cp ../.env.example ../.env
# Edit ../.env and configure your LLM provider

# Index the knowledge base
uv run python scripts/index_documents.py

# Start the server
uv run uvicorn cresco.main:app --reload --port 8000
```

The API documentation will be available at: http://localhost:8001/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at: http://localhost:5173

## Development

### Backend Development

```bash
cd backend

# Install dev dependencies
uv sync --extra dev

# Run tests
uv run pytest

# Code linting
uv run ruff check .
uv run ruff format .
```

### Frontend Development

```bash
cd frontend

# Lint code
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## License

MIT


# Cresco 🌱

AI Chatbot for UK Farmers - Agricultural knowledge assistant powered by LangChain and RAG (Retrieval-Augmented Generation).

## Features

- 🤖 Multi-provider LLM support (OpenAI, Google Gemini, Anthropic, Azure OpenAI, Ollama)
- 📚 RAG-based knowledge retrieval from agricultural documents
- 🔍 Vector search using ChromaDB
- 🌐 FastAPI backend with Swagger documentation

## Prerequisites

- Python 3.12 or higher
- [uv](https://github.com/astral-sh/uv) package manager (recommended)

## Quick Start

### 1. Install Dependencies

```bash
uv sync
```

If you don't have `uv` installed, you can install it via:

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or via pip
pip install uv
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit the `.env` file and configure your LLM provider:

### 3. Index the Knowledge Base

```bash
uv run python scripts/index_documents.py
```

Use `--force` flag to re-index all documents:

```bash
uv run python scripts/index_documents.py --force
```

### 4. Start the Server

```bash
uv run uvicorn cresco.main:app --reload --port 8001
```

The API documentation will be available at: http://localhost:8001/docs

## Development

### Install Development Dependencies

```bash
uv sync --extra dev
```

### Run Tests

```bash
uv run pytest
```

### Code Linting

```bash
uv run ruff check .
uv run ruff format .
```

## Project Structure

```
├── src/cresco/          # Main application package
│   ├── agent/           # LangGraph agent implementation
│   ├── api/             # FastAPI routes and schemas
│   ├── rag/             # RAG components (retriever, indexer, embeddings)
│   ├── config.py        # Application configuration
│   └── main.py          # FastAPI app entry point
├── scripts/             # Utility scripts
│   └── index_documents.py  # Knowledge base indexer
├── data/
│   ├── knowledge_base/  # Markdown documents for RAG
│   └── chroma_db/       # Vector database storage
├── tests/               # Test suite
└── pyproject.toml       # Project configuration
```

## License

MIT


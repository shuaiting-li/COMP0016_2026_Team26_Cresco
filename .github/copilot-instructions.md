# Cresco – Copilot Instructions

## Architecture

Cresco is a RAG-powered agricultural chatbot for UK farmers with a **Python/FastAPI backend** and a **React/Vite frontend**, living in `backend/` and `frontend/` respectively.

### Backend (`backend/cresco/`)

| Layer | Key files | Purpose |
|---|---|---|
| **API** | `api/routes.py`, `api/schemas.py` | FastAPI router mounted at `/api/v1`. Pydantic request/response models in schemas. |
| **Agent** | `agent/agent.py`, `agent/prompts.py` | LangGraph agent (`CrescoAgent`) using `create_agent()`. Supports Azure OpenAI (primary) and generic providers via `init_chat_model`. The agent defines a `retrieve_agricultural_info` tool inline. |
| **RAG** | `rag/retriever.py`, `rag/indexer.py`, `rag/embeddings.py`, `rag/document_loader.py` | ChromaDB vector store, Azure OpenAI embeddings, markdown document loading with category metadata. |
| **Config** | `config.py` | `pydantic-settings` based; reads `.env` from project root (`../.env` relative to `backend/`). |

**Singleton pattern**: `get_embeddings()`, `get_vector_store()`, `get_retriever()`, and `get_agent()` use module-level `_variable = None` singletons with `global`. When testing, reset these by setting the module-level variable to `None` before patching.

**Data flow**: User message → `POST /api/v1/chat` → `CrescoAgent.chat()` → LangGraph agent invokes `retrieve_agricultural_info` tool → ChromaDB similarity search → LLM generates answer with sources. The agent parses `---TASKS---` JSON blocks from the LLM response for actionable farming tasks.

### Frontend (`frontend/src/`)

React 19 + Vite app. No TypeScript (plain JSX). CSS Modules for layout components (`layout/*.module.css`). API calls in `services/api.js` use native `fetch` (no axios). Backend URL configured via `VITE_API_URL` env var (defaults to `http://localhost:8000/api/v1`).

**Response mapping**: Backend returns `{answer, sources, tasks}` → frontend maps to `{reply, citations, tasks}` in `api.js`.

## Development Commands

```bash
# Backend (run from backend/)
uv sync --extra dev          # Install with dev deps
uv run pytest                # Run tests
uv run pytest --cov --cov-report=term-missing  # Tests + coverage (80% minimum)
uv run ruff check .          # Lint
uv run ruff format .         # Format
uv run uvicorn cresco.main:app --reload --port 8000  # Dev server
uv run python scripts/index_documents.py  # Index knowledge base

# Frontend (run from frontend/)
npm install                  # Install deps
npm run dev                  # Dev server (port 3000)
npm run build                # Production build
npm run lint                 # ESLint
```

## Testing Conventions

- **Always use classes** to group tests: `class TestFeatureName:` — no bare test functions.
- **One test method docstring** per test, describing what it verifies.
- **File naming**: `test_<module>.py` mirrors source structure exactly.
- **Async tests**: `asyncio_mode = "auto"` in pyproject.toml — async tests are auto-detected.
- **Mock external services completely**: patch LangChain/ChromaDB at their import paths (e.g., `patch("cresco.rag.embeddings.AzureOpenAIEmbeddings")`). No real API calls in tests.
- **Reset singletons** before tests that touch them: `cresco.rag.embeddings._embeddings = None`.
- **API tests** use `TestClient` with `app.dependency_overrides` for injecting mocks, cleaned up via `app.dependency_overrides.clear()` after yield.
- **Fixtures** in `conftest.py`: `mock_settings` (real `Settings` with temp dirs), `mock_vector_store`, `mock_embeddings`, `mock_agent`, `client`, `sample_documents`, `temp_knowledge_base`.

## Code Style

- Python: **Ruff** for linting and formatting, 100 char line length, Python 3.12 target. Rules: E, F, I, N, W.
- Use `str | None` union syntax (Python 3.12), not `Optional[str]`.
- Pydantic v2 models with `Field(...)` for all API schemas.
- Frontend: ESLint, no TypeScript, functional React components with hooks.

## Key Conventions

- `.env` file lives at **project root** (not in `backend/`). Config reads `env_file="../.env"`.
- Knowledge base documents are **markdown files** in `backend/data/knowledge_base/`. The `_categorize_document()` function in `document_loader.py` assigns categories based on filename keywords.
- ChromaDB collection name is always `"cresco_knowledge_base"`.
- The backend uses `uv` as its package manager (not pip directly in dev).

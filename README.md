# Cresco 🌱

RAG-powered agricultural chatbot for UK farmers — **Python/FastAPI backend** and **React/Vite frontend**.

## Features

- 🤖 LangGraph agent with RAG retrieval and internet search (Tavily)
- 📚 ChromaDB vector store over agricultural markdown documents
- 🔐 JWT Bearer authentication (HS256) with admin-managed user registration
- 🌐 FastAPI backend with Swagger docs, Pydantic v2 schemas
- 💻 React 19 frontend with chat, satellite mapping (Leaflet), and weather (OpenWeatherMap)
- 🧪 Comprehensive test suite with 80 % minimum coverage enforced

## Prerequisites

- Python 3.12 or higher
- Node.js 18+ and npm
- [uv](https://github.com/astral-sh/uv) package manager (not pip)

## Project Structure

```
├── backend/                     # Python FastAPI backend
│   ├── cresco/                  # Main application package
│   │   ├── agent/               # LangGraph agent (agent.py, prompts.py)
│   │   ├── api/                 # FastAPI routes and Pydantic v2 schemas
│   │   ├── auth/                # JWT auth, user management, dependencies
│   │   ├── rag/                 # Retriever, indexer, embeddings, document loader
│   │   ├── config.py            # pydantic-settings config (reads ../.env)
│   │   └── main.py              # App factory (create_app)
│   ├── data/
│   │   ├── knowledge_base/      # Markdown documents for RAG
│   │   ├── chroma_db/           # ChromaDB vector database storage
│   │   └── users.json           # User store (JSON file)
│   ├── scripts/
│   │   ├── index_documents.py   # Index knowledge base into ChromaDB
│   │   └── create_admin.py      # Bootstrap first admin user
│   ├── tests/                   # Test suite
│   └── pyproject.toml           # Python project config (hatchling)
│
├── frontend/                    # React 19 + Vite (plain JSX, no TypeScript)
│   ├── src/
│   │   ├── layout/              # UI layout components (CSS Modules)
│   │   ├── services/            # API services (native fetch)
│   │   ├── tools/               # Utility modules
│   │   ├── App.jsx              # Main React component (state)
│   │   ├── satellite.jsx        # Leaflet map + @turf/area
│   │   └── weather.jsx          # OpenWeatherMap integration
│   ├── package.json
│   └── vite.config.js
│
├── .env                         # Environment variables (project root)
└── README.md
```

## Architecture

### Backend

| Layer      | Key files                                                                           | Purpose                                                                                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API**    | `api/routes.py`, `api/schemas.py`                                                   | FastAPI router mounted at `/api/v1`. Pydantic v2 request/response models.                                                                                                                                             |
| **Auth**   | `auth/routes.py`, `auth/dependencies.py`, `auth/jwt.py`, `auth/users.py`            | JWT Bearer auth (HS256 via `pyjwt`). Passwords hashed with `bcrypt`. Users stored in `data/users.json`. Registration is admin-only; login is public.                                                                  |
| **Agent**  | `agent/agent.py`, `agent/prompts.py`                                                | LangGraph agent with two tools: `retrieve_agricultural_info` (RAG) and `TavilySearch` (internet). `InMemorySaver` checkpointer keyed by `user_id`. Azure OpenAI (primary) or generic providers via `init_chat_model`. |
| **RAG**    | `rag/retriever.py`, `rag/indexer.py`, `rag/embeddings.py`, `rag/document_loader.py` | ChromaDB vector store, Azure OpenAI embeddings, markdown loading with filename-based category metadata. Chunks: 1 500 chars / 200 overlap.                                                                            |
| **Config** | `config.py`                                                                         | `pydantic-settings`; reads `.env` from **project root**.                                                                                                                                                              |

**Data flow:** User message → `POST /api/v1/chat` (Bearer token required) → farm/weather context appended → `CrescoAgent.chat()` → LangGraph agent invokes RAG tool → ChromaDB similarity search (k = 5) → LLM generates answer with optional `---TASKS---` JSON block.

**Auth flow:** `POST /api/v1/auth/login` → JWT → all endpoints except `/health` require `Authorization: Bearer <token>`.

### Frontend

React 19 + Vite. Plain JSX (no TypeScript). CSS Modules for layout. API calls via native `fetch` in `services/api.js`.

- **Auth**: JWT in `localStorage` (`cresco_token` / `cresco_username`). Auto-logout on 401/403.
- **Response mapping**: Backend `{answer, sources, tasks}` → frontend `{reply, citations, tasks}`.
- **Rendering**: `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex`.
- **Env vars**: `VITE_API_URL` (default `http://localhost:8000/api/v1`), `OPENWEATHER_API_KEY`.

## Quick Start

### Backend Setup

```bash
cd backend

# Install dependencies
uv sync

# Configure environment (create .env in project root)
cp ../.env.example ../.env
# Edit ../.env — configure your LLM provider, JWT secret, etc.

# Bootstrap the first admin user
uv run python scripts/create_admin.py <username> <password>

# Index the knowledge base
uv run python scripts/index_documents.py

# Start the server
uv run uvicorn cresco.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies and start dev server
npm install && npm run dev
```

Frontend: http://localhost:5173 (CORS allows ports 5173 and 3000)

## Development

### Backend

```bash
cd backend

# Install with dev dependencies
uv sync --extra dev

# Run tests
uv run pytest

# Tests + coverage (80 % minimum enforced)
uv run pytest --cov --cov-report=term-missing

# Lint + format
uv run ruff check . && uv run ruff format .
```

### Frontend

```bash
cd frontend

npm run lint      # ESLint
npm run build     # Production build
```

## Code Style

- **Python**: Ruff — 100 char lines, Python 3.12 target, rules `E, F, I, N, W`. Use `str | None` (PEP 604). Pydantic v2 models with `Field(...)`.
- **Frontend**: ESLint, functional React components with hooks, no TypeScript.

## Testing Conventions

- Always use classes: `class TestFeatureName:` — no bare test functions.
- Docstring per test method describing what it verifies.
- File naming: `test_<module>.py` mirrors source structure.
- Async tests: `asyncio_mode = "auto"` — no `@pytest.mark.asyncio` needed.
- Mock all external services; zero real API calls.
- Reset singletons before tests (e.g., `cresco.rag.embeddings._embeddings = None`).

## License

MIT


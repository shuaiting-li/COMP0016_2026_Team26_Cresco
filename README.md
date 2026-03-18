# Cresco

RAG-powered agricultural chatbot for UK farmers — **Python/FastAPI backend** and **React/Vite frontend**.

## Features

- **AI Chat Agent** — LangGraph agent with RAG retrieval, weather context, and internet search (Tavily)
- **Knowledge Base** — ChromaDB vector store over agricultural documents (.md, .pdf, .txt, .csv, .json)
- **Farm Management** — Interactive Leaflet map for farm location selection with polygon area calculation
- **Weather Integration** — Current conditions and 5-day forecast via OpenWeatherMap
- **Drone Imagery** — Upload RGB + NIR images for NDVI vegetation analysis
- **Satellite Imagery** — Fetch satellite images from Copernicus for farm locations
- **Data Visualization** — Auto-generated Recharts charts (bar, line, pie) from agent responses
- **Task Suggestions** — Agent generates actionable farming tasks with priorities
- **Authentication** — JWT Bearer auth (HS256) with admin-managed user registration
- **Multi-provider LLM** — Supports Azure OpenAI, OpenAI, Google Gemini, Anthropic, and Ollama

## Prerequisites

- Python 3.12+
- Node.js 18+ and npm
- [uv](https://github.com/astral-sh/uv) package manager
- Docker (for PostgreSQL) or a PostgreSQL 17+ instance

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env — set your LLM provider, API keys, and JWT secret
```

The `.env` file lives at the **project root**. Both backend and frontend read from it.

### 2. Start PostgreSQL

```bash
docker run -d --name cresco-postgres -p 5432:5432 \
  -e POSTGRES_USER=cresco -e POSTGRES_PASSWORD=cresco \
  -e POSTGRES_DB=cresco postgres:17-alpine
```

### 3. Backend setup

```bash
cd backend
uv sync                                          # Install dependencies
uv run python scripts/create_admin.py <user> <pass>  # Create first admin
uv run python scripts/index_documents.py         # Index knowledge base
uv run uvicorn cresco.main:app --reload --port 8000  # Start server
```

API docs available at http://localhost:8000/docs

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev    # Starts on http://localhost:3000
```

## Project Structure

```
├── backend/
│   ├── cresco/
│   │   ├── agent/          # LangGraph agent, system prompt, tools
│   │   ├── api/            # FastAPI routes and Pydantic v2 schemas
│   │   ├── auth/           # JWT auth, user management
│   │   ├── rag/            # ChromaDB retriever, indexer, embeddings, document loader
│   │   ├── config.py       # pydantic-settings (reads ../.env)
│   │   └── main.py         # App factory
│   ├── data/
│   │   ├── knowledge_base/ # Documents for RAG indexing
│   │   └── uploads/        # Per-user uploaded files
│   ├── scripts/            # Admin and indexing CLI scripts
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── layout/         # UI components (CSS Modules)
│   │   ├── services/       # Centralized API layer (api.js)
│   │   ├── tests/          # Vitest + React Testing Library
│   │   ├── App.jsx         # Root component and state
│   │   ├── satellite.jsx   # Leaflet map + @turf/area
│   │   └── weather.jsx     # Weather display
│   └── vite.config.js
│
├── .env                    # Environment variables (project root)
├── .env.example            # Template
└── docker-compose.yml      # PostgreSQL service
```

## Architecture

### Backend

| Layer | Purpose |
|-------|---------|
| **API** (`api/`) | FastAPI router at `/api/v1`. Endpoints for chat, file upload/delete, farm data, weather, geocoding, drone/satellite imagery, and health. Third-party APIs proxied server-side via `httpx`. |
| **Agent** (`agent/`) | LangGraph agent with three tools: RAG retrieval (ChromaDB, k=5), weather data (from PostgreSQL), and TavilySearch (internet). Parses structured `---TASKS---` and `---CHART---` blocks from LLM output. Per-user conversation memory via `AsyncPostgresSaver` (persists across restarts). |
| **RAG** (`rag/`) | ChromaDB vector store with Azure OpenAI embeddings. Supports multiple file formats. Chunks at 1500 chars / 200 overlap. Documents scoped by user ID for multi-tenant retrieval. |
| **Auth** (`auth/`) | JWT Bearer tokens (HS256, 24h expiry). Passwords hashed with bcrypt. Admin-only registration. |
| **Config** (`config.py`) | `pydantic-settings` singleton reading `.env` from project root. |

### Frontend

React 19 + Vite. Plain JSX (no TypeScript). CSS Modules for scoped styles.

- All backend calls go through `services/api.js` (Bearer token injection, auto-logout on 401/403)
- Backend `{answer, sources, tasks, charts}` mapped to `{reply, citations, tasks, charts}`
- Markdown rendering via `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex`
- Charts rendered with Recharts from agent-generated data

## Environment Variables

See [`.env.example`](.env.example) for the full template. Key variables:

| Variable | Description |
|----------|-------------|
| `MODEL_PROVIDER` | LLM provider: `azure-openai`, `openai`, `google-genai`, `anthropic`, `ollama` |
| `MODEL_NAME` | Model identifier (e.g., `gpt-4o-mini`, `gemini-2.0-flash`) |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key (backend) |
| `VITE_OPENWEATHER_API_KEY` | Same key exposed to frontend via Vite |
| `TAVILY_API_KEY` | Tavily search API key |
| `JWT_SECRET_KEY` | Secret for signing JWT tokens |
| `DATABASE_URL` | PostgreSQL connection string (default: `postgresql://cresco:cresco@localhost:5432/cresco`) |
| `COPERNICUS_CLIENT_ID` | Copernicus Data Space client ID (satellite imagery) |
| `COPERNICUS_CLIENT_SECRET` | Copernicus Data Space client secret |

## Development

### Backend

```bash
cd backend
uv sync --extra dev                              # Install with dev deps
uv run pytest                                    # Run tests
uv run pytest --cov --cov-report=term-missing    # Coverage (80% min enforced)
uv run pytest tests/test_api.py::TestName::test_method  # Single test
uv run ruff check . && uv run ruff format .      # Lint + format
```

### Frontend

```bash
cd frontend
npm test              # Run tests (Vitest)
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run lint          # ESLint
npm run build         # Production build
```

## License

MIT

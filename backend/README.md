# Cresco Backend

FastAPI backend for the Cresco agricultural AI chatbot. See the [main README](../README.md) for the full project overview.

## Quick Start

```bash
uv sync                                              # Install dependencies
uv run python scripts/create_admin.py <user> <pass>   # Create first admin
uv run python scripts/index_documents.py              # Index knowledge base
uv run uvicorn cresco.main:app --reload --port 8000   # Start server
```

API docs: http://localhost:8000/docs

## Architecture

| Layer | Key files | Purpose |
|-------|-----------|---------|
| **API** | `cresco/api/routes.py`, `cresco/api/schemas.py` | FastAPI router at `/api/v1`. Pydantic v2 request/response models. Third-party APIs (geocoding, weather) proxied via `httpx`. |
| **Agent** | `cresco/agent/agent.py`, `cresco/agent/prompts.py` | LangGraph agent with three tools: `retrieve_agricultural_info` (RAG), `get_weather_data` (farm context), and `TavilySearch` (internet). `InMemorySaver` checkpointer keyed by `user_id`. Multi-provider LLM via `init_chat_model`. |
| **RAG** | `cresco/rag/` | ChromaDB vector store, Azure OpenAI embeddings, document loading with filename-based category metadata. Chunks: 1500 chars / 200 overlap. Multi-tenant retrieval via `$or` filter (shared + user-specific). |
| **Auth** | `cresco/auth/` | JWT Bearer auth (HS256, 24h expiry, `pyjwt`). Passwords hashed with `bcrypt`. Users in `data/users.json`. Admin-only registration. |
| **Config** | `cresco/config.py` | `pydantic-settings` singleton; reads `.env` from **project root** (`../.env`). |

## API Endpoints

All endpoints mounted at `/api/v1`. All except `/health` require `Authorization: Bearer <token>`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Public login, returns JWT |
| POST | `/auth/register` | Admin-only user registration |
| POST | `/chat` | Send message to AI agent |
| DELETE | `/chat/last-exchange` | Remove last user-assistant exchange |
| POST | `/upload` | Upload and index a user file |
| DELETE | `/upload/{filename}` | Delete uploaded file and its indexed chunks |
| POST | `/index` | Index/re-index knowledge base |
| POST | `/farm-data` | Save farm location and coordinates |
| GET | `/farm-data` | Retrieve user's farm data |
| GET | `/weather` | Current weather + 5-day forecast |
| GET | `/geocode/search` | Forward geocoding (Nominatim proxy) |
| GET | `/geocode/reverse` | Reverse geocoding (Nominatim proxy) |
| POST | `/droneimage` | Process drone RGB + NIR images for NDVI |
| GET | `/images` | List saved NDVI images |
| GET | `/images/{filename}` | Serve a specific NDVI image |
| POST | `/satellite-image` | Fetch satellite imagery from Copernicus |
| GET | `/health` | Health check (no auth required) |

## Development

```bash
uv sync --extra dev                              # Install with dev deps
uv run pytest                                    # Run tests
uv run pytest --cov --cov-report=term-missing    # Coverage (80% min enforced)
uv run pytest tests/test_api.py::TestName::test_method  # Single test
uv run ruff check . && uv run ruff format .      # Lint + format
```

## Code Style

- **Ruff**: 100 char lines, Python 3.12 target, rules `E, F, I, N, W`
- Use `str | None` (PEP 604), not `Optional[str]`
- Pydantic v2 models with `Field(...)` for all API schemas
- Build system: `hatchling`
- Package manager: `uv` — always run commands via `uv run`

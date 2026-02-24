# Cresco Backend

FastAPI backend for the Cresco agricultural AI chatbot. See the [main README](../README.md) for the full project overview.

## Architecture

| Layer      | Key files                                          | Purpose                                                                                                                                            |
| ---------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API**    | `cresco/api/routes.py`, `cresco/api/schemas.py`    | FastAPI router at `/api/v1`. Pydantic v2 request/response models.                                                                                  |
| **Auth**   | `cresco/auth/`                                     | JWT Bearer auth (HS256, `pyjwt`). Passwords hashed with `bcrypt`. Users in `data/users.json`. Registration is admin-only; login is public.         |
| **Agent**  | `cresco/agent/agent.py`, `cresco/agent/prompts.py` | LangGraph agent with two tools: `retrieve_agricultural_info` (RAG) and `TavilySearch` (internet). `InMemorySaver` checkpointer keyed by `user_id`. |
| **RAG**    | `cresco/rag/`                                      | ChromaDB vector store, Azure OpenAI embeddings, markdown document loader with filename-based category metadata. Chunks: 1 500 chars / 200 overlap. |
| **Config** | `cresco/config.py`                                 | `pydantic-settings`; reads `.env` from **project root** (`../.env`).                                                                               |

## Quick Start

```bash
# Install dependencies
uv sync

# Bootstrap the first admin user
uv run python scripts/create_admin.py <username> <password>

# Index the knowledge base into ChromaDB
uv run python scripts/index_documents.py

# Start development server
uv run uvicorn cresco.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Development

```bash
# Install with dev dependencies
uv sync --extra dev

# Run tests
uv run pytest

# Tests + coverage (80 % minimum enforced)
uv run pytest --cov --cov-report=term-missing

# Run a specific test file
uv run pytest tests/test_api.py -v

# Lint + format
uv run ruff check . && uv run ruff format .
```

## Testing Conventions

- **Always use classes**: `class TestFeatureName:` — no bare test functions.
- **Docstring per test method** describing what it verifies.
- **File naming**: `test_<module>.py` mirrors source structure.
- **Async tests**: `asyncio_mode = "auto"` — no `@pytest.mark.asyncio` needed.
- **Mock all external services**: patch at import paths (e.g., `patch("cresco.rag.embeddings.AzureOpenAIEmbeddings")`). Zero real API calls.
- **Reset singletons** before tests: e.g., `cresco.rag.embeddings._embeddings = None`.
- **API test fixtures** (`conftest.py`):
  - `client` — sync `TestClient`, auth bypassed via `app.dependency_overrides`.
  - `auth_client` — sync `TestClient` with real auth but mock agent/settings.
  - `async_client` — `AsyncClient` with `ASGITransport`, auth bypassed.

## Code Style

- **Ruff**: 100 char lines, Python 3.12 target, rules `E, F, I, N, W`.
- Use `str | None` (PEP 604), not `Optional[str]`.
- Pydantic v2 models with `Field(...)` for all API schemas.
- Build system: `hatchling`.
- Package manager: `uv` — always run commands via `uv run`.

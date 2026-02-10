# Cresco Backend

FastAPI backend for the Cresco agricultural AI chatbot.

See the [main README](../README.md) for full documentation.

## Quick Start

```bash
# Install dependencies
uv sync

# Start development server
uv run uvicorn cresco.main:app --reload --port 8000
```

## Development

```bash
# Install dev dependencies
uv sync --extra dev

# Run tests
uv run pytest

# Run tests with coverage report
uv run pytest --cov=cresco --cov-report=term-missing

# Run specific test file
uv run pytest tests/test_api.py -v

# Lint code
uv run ruff check .
uv run ruff format .
```

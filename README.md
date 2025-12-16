# Agritech AI Assistant

> Intelligent farming assistant powered by LLM and RAG for sustainable agriculture.

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.124+-green.svg)](https://fastapi.tiangolo.com)
[![uv](https://img.shields.io/badge/uv-package%20manager-blueviolet)](https://docs.astral.sh/uv/)

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+ (for frontend)
- [uv](https://docs.astral.sh/uv/) (installed automatically by setup script)

### Setup

```bash
# Clone and setup
git clone https://github.com/shuaiting-li/agritech-project.git
cd agritech-project
./setup.sh

# Add your Gemini API key to .env
echo "GEMINI_API_KEY=your-key-here" >> .env
```

### Run

```bash
# Backend (API server)
uv run uvicorn app.main:app --reload

# Frontend (in separate terminal)
cd frontend && npm run dev
```

- **API**: http://127.0.0.1:8000/docs
- **Frontend**: http://localhost:3000

---

## Features

| Feature | Description |
|---------|-------------|
| 🌾 **Task Planning** | AI-generated daily farming recommendations |
| 💬 **Agricultural Q&A** | Natural language chat with RAG retrieval |
| 📚 **Knowledge Base** | Vector-indexed agricultural best practices |
| 🎯 **Context-Aware** | Personalized advice based on location and farm type |

---

## API Reference

### `POST /chat`

```bash
curl -X POST http://127.0.0.1:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How should I water maize?", "location": "Kenya", "farm_type": "maize"}'
```

### `POST /ingest`
Add documents to knowledge base.

### `GET /health`
Health check endpoint.

Full API documentation: http://127.0.0.1:8000/docs

---

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | [Google Gemini API key](https://aistudio.google.com/app/apikey) | Required |
| `LLM_MODE` | `gemini` or `offline` | `gemini` |
| `RAG_TOP_K` | Retrieved chunks count | `4` |
| `MAX_HISTORY` | Conversation turns | `6` |

See [.env.example](.env.example) for all options.

---

## Project Structure

```
agritech-project/
├── agritech_core/      # Core logic (agents, RAG, LLM)
├── app/                # FastAPI application
├── frontend/           # React frontend
├── data/knowledge_base/# Agricultural knowledge (markdown)
├── tests/              # Test suite
├── pyproject.toml      # Dependencies
└── uv.lock             # Locked dependency versions
```

---

## Development

```bash
# Install with dev dependencies
uv sync --dev

# Run tests
uv run pytest -v

# Type checking
uv run mypy agritech_core
```

---

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines on:
- Dependency management with uv
- Branch naming and commits
- Pull request process

---

## Team

**System Engineering Team 26, working with NTT DATA**

---

## License

MIT License - see [LICENSE](LICENSE)

---

> 📁 **Legacy docs**: [docs/archived/](docs/archived/INDEX.md)

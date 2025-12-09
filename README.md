# Agritech AI Assistant

> An intelligent, multi-agent farming assistant powered by LLM and RAG for sustainable agriculture.

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📋 Project Overview

The Agritech AI Assistant is an open-source, cost-effective farming advisory system that helps smallholder farmers with:

- 🌾 **Daily Task Recommendations** - Intelligent planning for farm activities
- 💬 **Agricultural Q&A** - Natural conversation powered by LLM and RAG
- 📚 **Knowledge Retrieval** - Access to agricultural best practices with citations
- 🎯 **Context-Aware Advice** - Personalized based on location and farm type

**Current Status**: MVP Backend (LLM + RAG) ✅ | Frontend & Vision Module 🚧

> 📄 **Full Project Specification**: See [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md)

---

## ✨ Key Features

### Current Implementation (v0.1)

- ✅ **FastAPI Backend** with `/chat`, `/ingest`, and `/health` endpoints
- ✅ **RAG System** with vector-based document retrieval
- ✅ **LLM Integration** (Google Gemini) with offline fallback mode
- ✅ **Multi-Agent Architecture** (Planner, RAG, Chat agents)
- ✅ **Conversation Memory** with rolling buffer
- ✅ **Auto-Ingestion** of markdown knowledge base on startup
- ✅ **Type-Safe API** with Pydantic schemas

### Planned Features

- 🚧 Frontend UI (React/Next.js)
- 🚧 Image processing for crop/pest identification
- 🚧 User authentication and profiles
- 🚧 Persistent storage (PostgreSQL)
- 🚧 Real-time weather integration
- 🚧 Satellite imagery analysis

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- pip package manager
- Git

### One-Command Setup

```bash
./setup.sh
```

This will:
1. Create virtual environment
2. Install all dependencies
3. Create `.env` configuration file
4. Run tests to verify setup

### Manual Setup

See **[docs/SETUP.md](docs/SETUP.md)** for detailed instructions.

### Start the Server

```bash
# Activate virtual environment
source .venv/bin/activate  # macOS/Linux
# or
.venv\Scripts\activate  # Windows

# Start development server
uvicorn app.main:app --reload

# Or run in offline mode (no API key needed)
LLM_MODE=offline uvicorn app.main:app --reload
```

Server will be available at: **http://127.0.0.1:8000**

### Test the API

**Interactive Swagger UI**: http://127.0.0.1:8000/docs

**Example Request**:
```bash
curl -X POST http://127.0.0.1:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How should I water my maize crops?",
    "location": "Kenya",
    "farm_type": "maize"
  }'
```

---

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

| Document | Description |
|----------|-------------|
| **[Project Specification](docs/PROJECT_SPEC.md)** | Complete project requirements and planning |
| **[Setup Guide](docs/SETUP.md)** | Installation and configuration instructions |
| **[Architecture](docs/ARCHITECTURE.md)** | System design and component overview |
| **[Contributing](docs/CONTRIBUTING.md)** | Development guidelines and code standards |
| **[Code Review](docs/CODEX_REVIEW.md)** | Known issues and technical debt |
| **[Handoff Guide](docs/HANDOFF.md)** | Developer transition checklist |

---

## 🏗️ Architecture

The system uses a multi-agent architecture:

```
Client Request
     ↓
FastAPI Server
     ↓
Orchestrator
     ↓
┌────────┬────────┬────────┐
│Planner │  RAG   │  Chat  │
│ Agent  │ Agent  │ Agent  │
└────────┴────────┴────────┘
     ↓        ↓        ↓
  Tasks  Knowledge  Reply
```

**Components**:
- **Planner Agent**: Generates actionable farming tasks
- **RAG Agent**: Retrieves relevant knowledge from vector store
- **Chat Agent**: Produces natural language responses via LLM
- **Memory**: Maintains conversation context (6-turn buffer)

For detailed architecture, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 🔌 API Endpoints

### `POST /chat`
Send a message and get AI-powered farming advice.

**Request**:
```json
{
  "message": "How do I control pests?",
  "location": "Kenya",
  "farm_type": "maize",
  "goals": ["increase yield", "reduce pesticide use"]
}
```

**Response**:
```json
{
  "reply": "For pest control in maize farming...",
  "tasks": [
    {
      "title": "Scout for pests",
      "detail": "Inspect crops twice weekly",
      "priority": "high"
    }
  ],
  "citations": ["pest_management.md"]
}
```

### `POST /ingest`
Add documents to the knowledge base.

**Request**:
```json
{
  "documents": [
    {
      "doc_id": "fertilizer-guide",
      "text": "Apply NPK at 50kg per hectare...",
      "metadata": {"source": "manual", "year": 2025}
    }
  ]
}
```

**Response**:
```json
{
  "chunks_added": 3
}
```

### `GET /health`
Health check endpoint.

**Response**:
```json
{
  "status": "ok"
}
```

---

## ⚙️ Configuration

Configuration via environment variables or `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key ([Get one](https://aistudio.google.com/app/apikey)) | None (offline mode) |
| `LLM_MODE` | `gemini` or `offline` | `gemini` |
| `GEMINI_MODEL` | Text generation model | `models/gemini-2.5-flash` |
| `GEMINI_EMBEDDING_MODEL` | Embedding model | `models/text-embedding-004` |
| `RAG_TOP_K` | Number of retrieved chunks | `4` |
| `CHUNK_SIZE` | Characters per chunk | `500` |
| `MAX_HISTORY` | Conversation turns to keep | `6` |

See [docs/SETUP.md](docs/SETUP.md) for complete configuration details.

---

## 🧪 Testing

```bash
# Run all tests
pytest -v

# Run specific test file
pytest tests/test_api_integration.py -v

# Run with coverage
pytest --cov=agritech_core --cov-report=html
```

**Test Coverage**: ~60% (aim for >80%)

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](docs/CONTRIBUTING.md) before submitting PRs.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Run tests (`pytest -v`)
5. Commit with conventional commits (`git commit -m "feat: add new feature"`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

---

## 📦 Project Structure

```
agritech-project/
├── agritech_core/          # Core business logic
│   ├── agents.py           # Multi-agent orchestrator
│   ├── llm.py              # LLM client wrappers
│   ├── rag.py              # RAG pipeline
│   ├── memory.py           # Conversation memory
│   └── schemas.py          # Pydantic models
├── app/
│   └── main.py             # FastAPI application
├── data/
│   └── knowledge_base/     # Agricultural knowledge (markdown)
├── docs/                   # Documentation
├── tests/                  # Test suite
├── .env.example            # Environment template
├── setup.sh                # Quick setup script
└── pyproject.toml          # Dependencies
```

---

## 🐛 Known Issues

See [docs/CODEX_REVIEW.md](docs/CODEX_REVIEW.md) for detailed code review and known issues.

**Critical Issues**:
- Deprecated FastAPI `on_event` usage
- Global mutable state (doesn't support multi-worker)
- Hash-based embeddings in offline mode (non-semantic)
- No input validation/rate limiting
- Security improvements needed

**Status**: These are being addressed in upcoming releases.

---

## 📅 Roadmap

### Milestone 1 (Dec 12, 2025)
- ✅ Backend API with RAG
- 🚧 Frontend UI
- 🚧 User authentication

### Milestone 2 (Jan 15, 2026)
- 🔜 Image upload and analysis
- 🔜 Weather integration
- 🔜 Enhanced memory system

### Milestone 3 (Feb 6, 2026)
- 🔜 Satellite imagery support
- 🔜 Farm boundary mapping
- 🔜 Mobile-responsive UI

### Milestone 4 (Mar 3, 2026)
- 🔜 Production deployment
- 🔜 Performance optimization
- 🔜 Complete documentation

See [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md) for complete timeline.

---

## 👥 Team

**NTTDATA AI for Sustainability Agritech Team**
- Sagar
- Sanchi
- Shuaiting
- Vivek

**Supervisor**: Professor Graham Roberts

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Google Gemini for LLM and embedding APIs
- FastAPI for the excellent web framework
- Open-source agricultural datasets
- NTTDATA for project sponsorship

---

## 📞 Support

- 📖 **Documentation**: [docs/](docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/shuaiting-li/agritech-project/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/shuaiting-li/agritech-project/discussions)

---

**Made with 🌱 for sustainable agriculture**

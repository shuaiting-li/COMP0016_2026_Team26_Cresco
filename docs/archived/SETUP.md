# Development Environment Setup Guide

This guide will help you set up the Agritech Assistant project from scratch.

## Prerequisites

- **Python**: Version 3.10 or higher
- **pip**: Python package installer (comes with Python)
- **Git**: For version control
- **Operating System**: macOS, Linux, or Windows with WSL

Check your Python version:
```bash
python --version  # or python3 --version
```

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/shuaiting-li/agritech-project.git
cd agritech-project
```

---

## Step 2: Create Virtual Environment

### macOS/Linux:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Windows (Command Prompt):
```bash
python -m venv .venv
.venv\Scripts\activate.bat
```

### Windows (PowerShell):
```bash
python -m venv .venv
.venv\Scripts\Activate.ps1
```

You should see `(.venv)` prefix in your terminal prompt.

---

## Step 3: Install Dependencies

Install the package in editable mode with development dependencies:

```bash
pip install --upgrade pip
pip install -e .[dev]
```

This installs:
- Core dependencies: `fastapi`, `uvicorn`, `pydantic`, `numpy`, `google-generativeai`
- Dev dependencies: `pytest`, `httpx`

Verify installation:
```bash
pip list | grep agritech-assistant
```

---

## Step 4: Configure Environment Variables

### Option A: Create `.env` File (Recommended)

Create a `.env` file in the project root:

```bash
touch .env
```

Add the following configuration:

```bash
# Required for production mode (Gemini API)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Model Configuration
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004

# Optional: RAG Configuration
RAG_TOP_K=4
CHUNK_SIZE=500
CHUNK_OVERLAP=50

# Optional: Memory Configuration
MAX_HISTORY=6

# Optional: Development Mode
# LLM_MODE=offline  # Uncomment to use offline stub (no API key needed)
```

### Option B: Export Environment Variables

For temporary session (will be lost after closing terminal):

```bash
export GEMINI_API_KEY="your_gemini_api_key_here"
export GEMINI_MODEL="gemini-2.5-flash"
export GEMINI_EMBEDDING_MODEL="text-embedding-004"
```

### Getting Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it in your `.env` file or export it

**⚠️ SECURITY WARNING**: 
- Never commit `.env` or `API_KEY` files to Git
- These files are in `.gitignore` by default
- Don't share your API key publicly

---

## Step 5: Verify Setup

### Run Tests

```bash
pytest -v
```

Expected output:
```
============ test session starts ============
collected 12 items

tests/test_embeddings.py::test_extract_embedding_values_from_dict PASSED
tests/test_embeddings.py::test_extract_embedding_values_from_namespace PASSED
tests/test_orchestrator.py::test_chat_flow_offline_mode PASSED
tests/test_api_integration.py::test_health_endpoint PASSED
[... more tests ...]

============ 12 passed in 0.5s ============
```

### Check Code Structure

```bash
python -c "from agritech_core import AgritechOrchestrator; print('Import successful!')"
```

---

## Step 6: Run the Server

### Development Mode (with auto-reload)

```bash
uvicorn app.main:app --reload --port 8000
```

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

**⚠️ Note**: Multi-worker mode is currently not supported due to global state issues (see CODEX_REVIEW.md issue #2)

### Offline Mode (No API Key Required)

For testing without Gemini API:

```bash
LLM_MODE=offline uvicorn app.main:app --reload --port 8000
```

Server should start with:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
INFO:app.main:Ingested 2 knowledge chunks during startup
```

---

## Step 7: Run the Frontend

### Install Dependencies

```bash
cd frontend
npm install
```

### Start Development Server

```bash
npm run dev
```

Frontend will be available at: **http://localhost:3000**

> **Note**: The frontend development server proxies API requests to `http://127.0.0.1:8000`. Make sure the backend is running first.

### Build for Production

```bash
npm run build
```

Production files will be generated in `frontend/dist/`.

---

## Step 8: Test the API

### Using Web Browser

Visit: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

This opens the interactive Swagger UI where you can test endpoints.

### Using curl

**Health Check:**
```bash
curl http://127.0.0.1:8000/health
```

**Chat Endpoint:**
```bash
curl -X POST http://127.0.0.1:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How should I water my crops?",
    "location": "Kenya",
    "farm_type": "maize"
  }'
```

**Ingest Documents:**
```bash
curl -X POST http://127.0.0.1:8000/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "doc_id": "fertilizer-guide",
        "text": "Apply nitrogen fertilizer at 50kg per hectare during planting season.",
        "metadata": {"source": "agricultural_manual", "year": 2025}
      }
    ]
  }'
```

### Using Python (httpx)

```python
import httpx

client = httpx.Client(base_url="http://127.0.0.1:8000")

# Health check
response = client.get("/health")
print(response.json())

# Chat
response = client.post("/chat", json={
    "message": "What are best practices for pest management?",
    "location": "Kenya"
})
print(response.json())
```

---

## Step 8: Add Knowledge Base Documents

Documents in `data/knowledge_base/*.md` are automatically ingested on startup.

To add new knowledge:

1. Create a markdown file in `data/knowledge_base/`:
   ```bash
   nano data/knowledge_base/fertilizer_guide.md
   ```

2. Add content:
   ```markdown
   # Fertilizer Application Guidelines
   
   ## Nitrogen Fertilizers
   - Apply 50-80 kg/ha for maize
   - Split application: 1/3 at planting, 2/3 at 4 weeks
   
   ## Timing
   - Best applied before rainy season
   - Avoid over-application to prevent runoff
   ```

3. Restart the server to reload documents

---

## Troubleshooting

### Issue: `ModuleNotFoundError: No module named 'agritech_core'`

**Solution**: Install the package in editable mode:
```bash
pip install -e .
```

### Issue: `ModuleNotFoundError: No module named 'google.generativeai'`

**Solution**: Install dependencies:
```bash
pip install -e .[dev]
```

### Issue: Tests fail with import errors

**Solution**: Ensure you're in the virtual environment:
```bash
which python  # Should show path to .venv/bin/python
source .venv/bin/activate  # If not activated
```

### Issue: `WARNING: Using OfflineLLMClient because Gemini credentials are missing`

This is expected if:
- You haven't set `GEMINI_API_KEY`
- You set `LLM_MODE=offline`

**Solution**: 
- For production: Set `GEMINI_API_KEY` in `.env`
- For development: This is fine, offline mode will work

### Issue: Server port 8000 already in use

**Solution**: Use a different port or kill the existing process:
```bash
# Use different port
uvicorn app.main:app --port 8001

# Or kill existing process
lsof -ti:8000 | xargs kill -9
```

### Issue: API returns `[offline stub]` responses

**Explanation**: You're in offline mode (stub LLM)

**Solution**: Set `GEMINI_API_KEY` and ensure `LLM_MODE` is not set to `offline`

---

## Development Workflow

### Daily Development

1. **Activate virtual environment:**
   ```bash
   source .venv/bin/activate
   ```

2. **Start server in development mode:**
   ```bash
   uvicorn app.main:app --reload
   ```

3. **Run tests after changes:**
   ```bash
   pytest -v
   ```

4. **Check for errors:**
   ```bash
   pytest --tb=short
   ```

### Before Committing Code

1. **Run all tests:**
   ```bash
   pytest -v
   ```

2. **Check for type errors (if using mypy):**
   ```bash
   pip install mypy
   mypy agritech_core/ app/
   ```

3. **Format code (if using black):**
   ```bash
   pip install black
   black agritech_core/ app/ tests/
   ```

---

## Project Structure

```
agritech-project/
├── agritech_core/          # Core business logic
│   ├── __init__.py
│   ├── agents.py           # Orchestrator and agents
│   ├── config.py           # Configuration management
│   ├── llm.py              # LLM client wrappers
│   ├── memory.py           # Conversation memory
│   ├── rag.py              # RAG pipeline
│   └── schemas.py          # Pydantic models
├── app/
│   └── main.py             # FastAPI application
├── data/
│   └── knowledge_base/     # Markdown documents (auto-ingested)
│       ├── pest_management.md
│       └── soil_health.md
├── tests/
│   ├── test_embeddings.py
│   ├── test_orchestrator.py
│   └── test_api_integration.py
├── .gitignore
├── pyproject.toml          # Dependencies and metadata
├── README.md               # Project documentation
├── SETUP.md                # This file
└── CODEX_REVIEW.md         # Code review findings
```

---

## Environment Variables Reference

| Variable                 | Required       | Default                     | Description                |
| ------------------------ | -------------- | --------------------------- | -------------------------- |
| `GEMINI_API_KEY`         | For production | None                        | Google Gemini API key      |
| `LLM_MODE`               | No             | `gemini`                    | `gemini` or `offline`      |
| `GEMINI_MODEL`           | No             | `models/gemini-2.5-flash`   | Text generation model      |
| `GEMINI_EMBEDDING_MODEL` | No             | `models/text-embedding-004` | Embedding model            |
| `RAG_TOP_K`              | No             | `4`                         | Number of retrieved chunks |
| `CHUNK_SIZE`             | No             | `500`                       | Characters per chunk       |
| `CHUNK_OVERLAP`          | No             | `50`                        | Overlap between chunks     |
| `MAX_HISTORY`            | No             | `6`                         | Conversation turns to keep |

---

## Next Steps

- Read [README.md](README.md) for project overview and requirements
- Read [CODEX_REVIEW.md](CODEX_REVIEW.md) for known issues and limitations
- Check [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) for API documentation
- Add your own knowledge base documents to `data/knowledge_base/`

---

## Getting Help

- **API Documentation**: http://127.0.0.1:8000/docs (when server is running)
- **GitHub Issues**: https://github.com/shuaiting-li/agritech-project/issues
- **Project README**: [README.md](README.md)

---

## Common Commands Cheat Sheet

```bash
# Environment
source .venv/bin/activate      # Activate venv (macOS/Linux)
deactivate                     # Deactivate venv

# Installation
pip install -e .[dev]          # Install with dev dependencies
pip install --upgrade -e .     # Upgrade installation

# Running
uvicorn app.main:app --reload  # Development server
LLM_MODE=offline uvicorn app.main:app --reload  # Offline mode

# Testing
pytest -v                      # Run all tests verbosely
pytest tests/test_api_integration.py  # Run specific test file
pytest -k "chat"              # Run tests matching pattern

# Debugging
pytest --pdb                   # Drop into debugger on failure
uvicorn app.main:app --log-level debug  # Verbose logging
```

---

**Last Updated**: November 25, 2025  
**Maintainers**: NTTDATA Agritech Team

# Developer Handoff Guide

This document provides a structured handoff process for developers transitioning into or out of the Agritech Assistant project.

---

## Pre-Handoff Checklist (Outgoing Developer)

Complete these items before transitioning:

### Code & Repository
- [ ] All work-in-progress committed and pushed
- [ ] Feature branches merged or documented
- [ ] No uncommitted secrets or credentials
- [ ] `main` branch is stable and tests pass

### Documentation
- [ ] README.md is up to date
- [ ] Architecture documentation reflects current state
- [ ] Known issues documented in CODEX_REVIEW.md
- [ ] API documentation accessible at `/docs`

### Environment
- [ ] `.env.example` contains all required variables
- [ ] `setup.sh` works on a clean machine
- [ ] All dependencies listed in `pyproject.toml`

### Knowledge Transfer
- [ ] Scheduled handoff meeting
- [ ] Prepared list of critical information
- [ ] Identified potential blockers or risks

---

## Files to Share

Ensure the incoming developer has access to:

| File/Resource | Location | Purpose |
|--------------|----------|---------|
| Repository | GitHub | Full codebase access |
| `.env` template | `.env.example` | Environment configuration |
| API Keys | Secure channel only | Gemini API access |
| Design docs | `docs/` folder | Architecture understanding |
| Roadmap | `docs/PROJECT_SPEC.md` | Milestone planning |

> [!CAUTION]
> Never share `.env` files or API keys via email, Slack, or Git. Use a secure password manager or encrypted channel.

---

## Onboarding Steps (Incoming Developer)

### Day 1: Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/shuaiting-li/agritech-project.git
   cd agritech-project
   ```

2. **Run automated setup**
   ```bash
   ./setup.sh
   ```

3. **Verify installation**
   ```bash
   source .venv/bin/activate
   pytest -v
   ```

4. **Start the server**
   ```bash
   # Offline mode (no API key needed)
   LLM_MODE=offline uvicorn app.main:app --reload
   
   # Or with Gemini API
   uvicorn app.main:app --reload
   ```

5. **Test the API**
   - Visit http://127.0.0.1:8000/docs
   - Send a test chat message

### Day 2: Codebase Understanding

1. **Read documentation in order**:
   - `README.md` - Project overview
   - `docs/PROJECT_SPEC.md` - Requirements & milestones
   - `docs/ARCHITECTURE.md` - System design
   - `docs/CODEX_REVIEW.md` - Known issues

2. **Explore key files**:
   - `app/main.py` - FastAPI endpoints
   - `agritech_core/agents.py` - Core agent logic
   - `agritech_core/rag.py` - RAG pipeline
   - `agritech_core/llm.py` - LLM client abstraction

3. **Run through the code flow**:
   - Trace a `/chat` request from endpoint to response
   - Understand how agents coordinate

### Day 3: Development Workflow

1. **Read contributing guidelines**: `docs/CONTRIBUTING.md`

2. **Practice the workflow**:
   - Create a feature branch
   - Make a small change
   - Run tests
   - Create a PR (even if just for practice)

3. **Review test files**:
   - Understand test structure
   - Identify coverage gaps

---

## Critical Information

### System Architecture

```
Client → FastAPI → Orchestrator → Agents → LLM/RAG → Response
                        ↓
              ┌─────────┼─────────┐
              ↓         ↓         ↓
          Planner    RAG      Chat
          Agent     Agent     Agent
```

### Key Configuration

| Variable | Description | How to Get |
|----------|-------------|------------|
| `GEMINI_API_KEY` | LLM access | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `LLM_MODE` | gemini/offline | Set in `.env` |
| `RAG_TOP_K` | Retrieval count | Default: 4 |

### Important Paths

```
agritech_core/        # Core business logic
├── agents.py         # Multi-agent orchestrator
├── rag.py           # RAG pipeline
├── llm.py           # LLM client wrappers
├── memory.py        # Conversation memory
└── config.py        # Settings management

app/main.py          # FastAPI application
data/knowledge_base/ # Markdown documents (auto-ingested)
tests/               # Test suite
```

### Current State & Priorities

**What's Working**:
- ✅ Chat endpoint with RAG
- ✅ Document ingestion
- ✅ LLM-powered task planning
- ✅ Offline development mode

**What's In Progress**:
- 🔄 Test coverage improvements
- 🔄 Documentation updates

**What's Not Started**:
- ❌ User authentication
- ❌ Image processing
- ❌ Frontend UI

---

## Common Issues & Solutions

### Issue: "ModuleNotFoundError: No module named 'agritech_core'"
**Solution**: Install in editable mode
```bash
pip install -e .
```

### Issue: Tests fail with import errors
**Solution**: Ensure virtual environment is activated
```bash
source .venv/bin/activate
```

### Issue: API returns "[offline stub]" responses
**Solution**: Set `GEMINI_API_KEY` in `.env` and ensure `LLM_MODE` is not `offline`

### Issue: Knowledge base not loading
**Solution**: Check that `data/knowledge_base/` contains `.md` files

### Issue: Server port already in use
**Solution**: Use a different port or kill existing process
```bash
uvicorn app.main:app --port 8001
# or
lsof -ti:8000 | xargs kill -9
```

---

## Development Workflow

### Daily Workflow
```bash
# 1. Activate environment
source .venv/bin/activate

# 2. Pull latest changes
git pull origin main

# 3. Start development server
uvicorn app.main:app --reload

# 4. Make changes and test
pytest -v

# 5. Commit and push
git add .
git commit -m "feat: your changes"
git push origin your-branch
```

### Before Submitting PR
- [ ] All tests pass (`pytest -v`)
- [ ] Code follows style guide
- [ ] Documentation updated if needed
- [ ] No debug code or print statements
- [ ] Commit messages follow convention

---

## Team & Support

### Current Team
| Role | Name | Contact |
|------|------|---------|
| Developer | Sagar | [Team Slack] |
| Developer | Sanchi | [Team Slack] |
| Developer | Shuaiting | [Team Slack] |
| Developer | Vivek | [Team Slack] |
| Supervisor | Prof. Graham Roberts | [University Email] |

### Getting Help
- **Slack**: [#agritech-project]
- **GitHub Issues**: For bugs and feature requests
- **Documentation**: `docs/` folder

---

## Sign-Off

### Outgoing Developer Confirmation
- [ ] All items in pre-handoff checklist complete
- [ ] Handoff meeting conducted
- [ ] Incoming developer successfully ran the project
- [ ] All questions answered

**Outgoing Developer**: _________________ **Date**: _________________

### Incoming Developer Confirmation
- [ ] Successfully cloned and ran the project
- [ ] Understands the architecture
- [ ] Knows where to find documentation
- [ ] Has access to all necessary resources

**Incoming Developer**: _________________ **Date**: _________________

---

**Last Updated**: December 9, 2025  
**Template Version**: 1.0

# Contributing Guidelines

Thank you for contributing to the Agritech Assistant project! This document provides guidelines for contributing code, documentation, and other improvements.

## Table of Contents
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

---

## Getting Started

### Prerequisites
- Python 3.10 or higher
- Git
- Virtual environment (venv)
- Code editor (VS Code recommended)

### Initial Setup
1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/agritech-project.git
   cd agritech-project
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/shuaiting-li/agritech-project.git
   ```
4. Run setup script:
   ```bash
   ./setup.sh
   ```

---

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your work:

```bash
# Update master
git checkout master
git pull upstream master

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch Naming Convention**:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/improvements

### 2. Make Your Changes

- Write clear, concise commit messages
- Keep commits focused (one logical change per commit)
- Test your changes locally

### 3. Commit Your Changes

```bash
git add .
git commit -m "feat: add new endpoint for crop recommendations"
```

**Commit Message Format**:
```
<type>: <short description>

<optional detailed description>

<optional footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```bash
git commit -m "feat: add rate limiting to chat endpoint"
git commit -m "fix: resolve memory leak in vector store"
git commit -m "docs: update setup instructions for Windows"
git commit -m "test: add integration tests for ingest endpoint"
```

### 4. Keep Your Branch Updated

```bash
# Fetch latest changes
git fetch upstream

# Rebase your branch
git rebase upstream/master

# Resolve any conflicts if needed
```

### 5. Push Your Changes

```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request

1. Go to GitHub and create a Pull Request
2. Fill out the PR template
3. Link related issues
4. Request review from team members

---

## Code Style

### Python Style Guide

We follow **PEP 8** with some modifications:

#### Formatting
- **Line length**: 100 characters (soft limit)
- **Indentation**: 4 spaces (no tabs)
- **Quotes**: Double quotes for strings
- **Imports**: Group and sort (stdlib, third-party, local)

#### Example:
```python
"""Module docstring."""

from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

from agritech_core import Settings


class MyClass:
    """Class docstring."""
    
    def __init__(self, value: str) -> None:
        self.value = value
    
    def process(self, data: dict[str, Any]) -> str:
        """Process data and return result."""
        result = f"Processed: {data}"
        return result
```

### Type Hints

**Always use type hints**:

```python
# Good ✅
def calculate_score(items: list[str], weights: dict[str, float]) -> float:
    return sum(weights.get(item, 0.0) for item in items)

# Bad ❌
def calculate_score(items, weights):
    return sum(weights.get(item, 0.0) for item in items)
```

### Docstrings

Use **Google-style docstrings**:

```python
def retrieve_documents(query: str, top_k: int = 5) -> list[Document]:
    """Retrieve relevant documents from the knowledge base.
    
    Args:
        query: Search query text.
        top_k: Number of documents to return. Defaults to 5.
    
    Returns:
        List of Document objects sorted by relevance.
    
    Raises:
        ValueError: If query is empty or top_k is negative.
    
    Example:
        >>> docs = retrieve_documents("pest control", top_k=3)
        >>> len(docs)
        3
    """
    if not query.strip():
        raise ValueError("Query cannot be empty")
    # ... implementation
```

### Naming Conventions

```python
# Classes: PascalCase
class AgritechOrchestrator:
    pass

# Functions/methods: snake_case
def build_prompt(request: ChatRequest) -> str:
    pass

# Variables: snake_case
user_message = "Hello"
max_tokens = 1000

# Constants: UPPER_SNAKE_CASE
MAX_RETRIES = 3
DEFAULT_MODEL = "gemini-2.5-flash"

# Private attributes: leading underscore
class MyClass:
    def __init__(self):
        self._internal_state = {}
```

### File Organization

```python
"""Module docstring at top."""

# 1. Future imports
from __future__ import annotations

# 2. Standard library imports
import os
from typing import Any

# 3. Third-party imports
from fastapi import FastAPI
from pydantic import BaseModel

# 4. Local imports
from agritech_core import Settings
from agritech_core.rag import KnowledgeBase

# 5. Constants
DEFAULT_TIMEOUT = 30

# 6. Classes and functions
class MyClass:
    pass

def my_function():
    pass
```

---

## Testing Requirements

### Test Coverage

- All new features **must** have tests
- Aim for **>80% code coverage**
- Test both happy paths and edge cases

### Test Types

#### 1. Unit Tests
Test individual functions/classes in isolation:

```python
def test_chunker_splits_text():
    chunker = TextChunker(chunk_size=10, overlap=2)
    doc = Document(doc_id="test", text="Hello World Test")
    
    chunks = chunker.split(doc)
    
    assert len(chunks) == 2
    assert chunks[0].text == "Hello Worl"
    assert chunks[1].text == "ld Test"
```

#### 2. Integration Tests
Test component interactions:

```python
def test_chat_endpoint_integration(client):
    response = client.post("/chat", json={
        "message": "How to water crops?"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "tasks" in data
```

#### 3. Edge Cases
Test error conditions:

```python
def test_empty_message_returns_error():
    with pytest.raises(ValueError):
        orchestrator.handle_chat(ChatRequest(message=""))
```

### Running Tests

```bash
# Run all tests
pytest -v

# Run specific file
pytest tests/test_api_integration.py -v

# Run PlannerAgent unit tests
pytest tests/test_planner_agent.py -v

# Run manual verification script for PlannerAgent
python verify_planner.py

# Run with coverage
pytest --cov=agritech_core --cov-report=html
```

### Test Fixtures

Use pytest fixtures for common setup:

```python
@pytest.fixture
def settings():
    return Settings(llm_mode="offline")

@pytest.fixture
def orchestrator(settings):
    return AgritechOrchestrator(settings=settings)

def test_with_fixture(orchestrator):
    result = orchestrator.handle_chat(ChatRequest(message="test"))
    assert result.reply
```

---

## Pull Request Process

### Before Submitting

✅ **Checklist**:
- [ ] Code follows style guide
- [ ] All tests pass (`pytest -v`)
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No merge conflicts with master
- [ ] Commit messages follow convention
- [ ] No debug code or print statements

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Related Issues
Closes #123

## Screenshots (if applicable)

## Checklist
- [ ] Code follows style guide
- [ ] Tests pass locally
- [ ] Documentation updated
```

### Review Process

1. **Automated Checks**: CI runs tests and linting
2. **Code Review**: At least 1 approval required
3. **Address Feedback**: Make requested changes
4. **Merge**: Maintainer merges when approved

### After Merge

- Delete your feature branch
- Update your local master:
  ```bash
  git checkout master
  git pull upstream master
  ```

---

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
Clear description of what went wrong

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should have happened

**Actual behavior**
What actually happened

**Environment**
- OS: [e.g., macOS 13.0]
- Python version: [e.g., 3.10.5]
- Project version: [e.g., 0.1.0]

**Additional context**
Error messages, logs, screenshots
```

### Feature Requests

```markdown
**Problem Statement**
What problem does this solve?

**Proposed Solution**
How should it work?

**Alternatives Considered**
Other approaches you've thought of

**Additional Context**
Mockups, examples, references
```

---

## Code Review Guidelines

### For Authors

- Keep PRs small and focused
- Provide context in PR description
- Respond to feedback promptly
- Don't take feedback personally

### For Reviewers

- Be respectful and constructive
- Explain **why**, not just **what**
- Approve when ready (don't nitpick)
- Check for:
  - Correctness
  - Test coverage
  - Code style
  - Documentation
  - Security issues

---

## Development Tools

### Recommended Tools

1. **Code Editor**: VS Code with extensions:
   - Python
   - Pylance
   - Python Test Explorer
   - GitLens

2. **Linting** (optional but recommended):
   ```bash
   pip install black mypy ruff
   
   # Format code
   black agritech_core/ app/
   
   # Type checking
   mypy agritech_core/
   
   # Linting
   ruff check agritech_core/
   ```

3. **Pre-commit Hooks** (optional):
   ```bash
   pip install pre-commit
   pre-commit install
   ```

---

## Documentation

### When to Update Docs

- New features → Update README.md and ARCHITECTURE.md
- API changes → Update docstrings and /docs examples
- Setup changes → Update SETUP.md
- Bug fixes → Update CODEX_REVIEW.md if fixing known issue

### Documentation Style

- Use clear, concise language
- Include code examples
- Keep it up to date with code changes
- Add diagrams when helpful

---

## Communication

### Channels

- **GitHub Issues**: Bug reports, feature requests
- **Pull Requests**: Code discussions
- **Slack**: [#agritech-project] - Quick questions
- **Email**: Project maintainers - Urgent issues

### Response Times

- Issues: Within 2 business days
- PRs: Within 3 business days
- Security issues: Within 24 hours

---

## Security

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead:
1. Email project maintainers directly
2. Include detailed description
3. Provide reproduction steps if possible
4. Wait for response before disclosure

### Secure Coding

- Never commit secrets (API keys, passwords)
- Validate all user input
- Use parameterized queries
- Keep dependencies updated
- Follow OWASP guidelines

---

## License

By contributing, you agree that your contributions will be licensed under the project's license.

---

## Questions?

- Check [SETUP.md](SETUP.md) for setup help
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Ask in Slack [#agritech-project]
- Open a discussion on GitHub

---

**Thank you for contributing! 🌱**

---

**Last Updated**: November 25, 2025  
**Maintainers**: NTTDATA Agritech Team

# Contributing Guide

Welcome! This guide covers how to contribute to the Agritech Assistant project.

---

## Quick Setup

```bash
# Clone and setup
git clone https://github.com/shuaiting-li/agritech-project.git
cd agritech-project
./setup.sh

# Or manually with uv
uv sync --dev
```

---

## Dependency Management

We use **[uv](https://docs.astral.sh/uv/)** for fast, reproducible dependency management.

### Adding Dependencies

```bash
# Add a runtime dependency
uv add <package>

# Add a dev-only dependency
uv add --dev <package>

# Update lock file after editing pyproject.toml manually
uv lock
```

### Syncing Dependencies

```bash
# Install all dependencies (including dev)
uv sync --dev

# Production only
uv sync --no-dev
```

### Running Commands

```bash
# Run any command in the project environment
uv run <command>

# Examples
uv run uvicorn app.main:app --reload
uv run pytest -v
uv run python verify_planner.py
```

> **Important**: Always commit `uv.lock` when dependencies change.

---

## Branch Naming

| Prefix | Use Case | Example |
|--------|----------|---------|
| `feature/` | New features | `feature/weather-integration` |
| `fix/` | Bug fixes | `fix/memory-leak` |
| `chore/` | Maintenance | `chore/upgrade-deps` |
| `docs/` | Documentation | `docs/api-examples` |
| `dev/` | Development branches | `dev/backend` |

### Workflow

```bash
# Start from master
git checkout master
git pull origin master

# Create your branch
git switch -c feature/my-feature

# Make changes, then push
git push -u origin feature/my-feature
```

---

## Commit Messages

We follow **[Conventional Commits](https://www.conventionalcommits.org/)**:

```
<type>(<scope>): <description>

<optional body>
```

### Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Maintenance, deps, config |
| `refactor` | Code change (no new feature/fix) |
| `test` | Adding/updating tests |

### Examples

```bash
git commit -m "feat(rag): add batch embedding support"
git commit -m "fix(api): handle empty message validation"
git commit -m "docs: update README with uv commands"
git commit -m "chore: switch to uv from pip"
```

---

## Pull Requests

### Before Opening PR

1. Ensure your branch is up to date:
   ```bash
   git fetch origin
   git rebase origin/master
   ```

2. Run tests:
   ```bash
   uv run pytest -v
   ```

3. Verify the server starts:
   ```bash
   uv run uvicorn app.main:app --reload
   ```

### PR Checklist

- [ ] Branch follows naming convention
- [ ] Commits follow conventional commits format
- [ ] Tests pass locally
- [ ] `uv.lock` updated if dependencies changed
- [ ] No debug/print statements left

### PR Title Format

Use the same format as commit messages:
```
feat(component): add new feature
fix(api): resolve validation error
```

---

## Code Style

We use **[Black](https://black.readthedocs.io/)** for code formatting.

- **Formatter**: Black (required)
- **Line length**: 100 characters
- **Type hints**: Required
- **Imports**: Sorted (stdlib → third-party → local)
- **Docstrings**: Google style

### Formatting

```bash
# Format code before committing
uv run black agritech_core/ app/ tests/

# Check without modifying
uv run black --check agritech_core/ app/
```

### Optional Linting

```bash
uv run ruff check agritech_core/
uv run mypy agritech_core/
```

---

## Project Structure

```
agritech-project/
├── agritech_core/    # Core logic
├── app/              # FastAPI app
├── frontend/         # React frontend
├── tests/            # Test suite
├── pyproject.toml    # Dependencies
└── uv.lock           # Locked versions
```

---

## Questions?

Open a GitHub issue or discussion.

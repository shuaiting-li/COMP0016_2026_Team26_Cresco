"""Shared pytest fixtures for Cresco backend tests."""

import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

from cresco.config import Settings


@pytest.fixture
def mock_settings():
    """Create mock settings for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        settings = Settings(
            model_provider="openai",
            model_name="gpt-4o-mini",
            embedding_model="text-embedding-ada-002",
            azure_openai_endpoint="https://test.openai.azure.com",
            azure_openai_api_version="2024-08-01-preview",
            azure_openai_deployment="test-deployment",
            azure_openai_embedding_deployment="test-embedding",
            chroma_persist_dir=str(Path(tmpdir) / "chroma_db"),
            knowledge_base_path=str(Path(tmpdir) / "knowledge_base"),
            api_host="0.0.0.0",
            api_port=8000,
            debug=True,
            jwt_secret_key="test-secret-key-for-testing-only",
            jwt_expiry_hours=24,
            users_file=str(Path(tmpdir) / "users.json"),
        )
        # Create the knowledge base directory
        Path(settings.knowledge_base_path).mkdir(parents=True, exist_ok=True)
        yield settings


@pytest.fixture
def mock_vector_store():
    """Create a mock vector store."""
    mock_store = MagicMock()
    mock_store.similarity_search.return_value = [
        MagicMock(
            page_content="Test content about wheat disease management.",
            metadata={"filename": "wheat_guide.md", "category": "disease_management"},
        ),
        MagicMock(
            page_content="Test content about nutrient management.",
            metadata={
                "filename": "nutrient_guide.md",
                "category": "nutrient_management",
            },
        ),
    ]
    mock_store.as_retriever.return_value = MagicMock()
    mock_store._collection = MagicMock()
    mock_store._collection.count.return_value = 100
    return mock_store


@pytest.fixture
def mock_embeddings():
    """Create mock embeddings."""
    mock_emb = MagicMock()
    mock_emb.embed_documents.return_value = [[0.1, 0.2, 0.3] * 100]
    mock_emb.embed_query.return_value = [0.1, 0.2, 0.3] * 100
    return mock_emb


@pytest.fixture
def mock_agent():
    """Create a mock CrescoAgent."""
    mock = AsyncMock()
    mock.chat.return_value = {
        "answer": "This is a test response about wheat cultivation in the UK.",
        "sources": ["wheat_guide.md", "crop_management.md"],
        "tasks": [
            {
                "title": "Soil Test",
                "detail": "Conduct soil analysis",
                "priority": "high",
            }
        ],
    }
    return mock


@pytest.fixture
def client():
    """Create FastAPI test client with mocked dependencies (auth bypassed)."""
    # Import here to avoid circular imports
    from cresco.agent.agent import get_agent
    from cresco.auth.dependencies import get_current_user
    from cresco.config import get_settings
    from cresco.main import app

    # Create mock agent
    mock_agent = AsyncMock()
    mock_agent.chat.return_value = {
        "answer": "Test response",
        "sources": ["test.md"],
        "tasks": [],
    }

    # Create mock settings
    mock_settings = MagicMock()
    mock_settings.knowledge_base = Path("/tmp/kb")

    # Override dependencies — bypass auth for existing API tests
    app.dependency_overrides[get_agent] = lambda: mock_agent
    app.dependency_overrides[get_settings] = lambda: mock_settings
    app.dependency_overrides[get_current_user] = lambda: {
        "user_id": "test-user-id",
        "username": "testuser",
        "is_admin": False,
    }

    with patch("cresco.api.routes.is_indexed", return_value=True):
        yield TestClient(app)

    # Clean up overrides
    app.dependency_overrides.clear()


@pytest.fixture
def tmp_users_file(mock_settings):
    """Ensure users_file points to a temporary file and is clean for each test."""
    users_path = Path(mock_settings.users_file)
    users_path.parent.mkdir(parents=True, exist_ok=True)
    # Start with empty users
    users_path.write_text('{"users": {}}', encoding="utf-8")
    yield users_path
    # Cleanup
    if users_path.exists():
        users_path.unlink()


@pytest.fixture
def auth_client(mock_settings, tmp_users_file):
    """Create FastAPI test client with mocked deps and real auth (using tmp users file)."""
    from cresco.agent.agent import get_agent
    from cresco.config import get_settings
    from cresco.main import app

    # Create mock agent
    mock_agent_instance = AsyncMock()
    mock_agent_instance.chat.return_value = {
        "answer": "Test response",
        "sources": ["test.md"],
        "tasks": [],
    }

    # Override dependencies — use real auth but mock agent and settings
    app.dependency_overrides[get_agent] = lambda: mock_agent_instance
    app.dependency_overrides[get_settings] = lambda: mock_settings

    with patch("cresco.api.routes.is_indexed", return_value=True), \
         patch("cresco.auth.users.get_settings", return_value=mock_settings), \
         patch("cresco.auth.jwt.get_settings", return_value=mock_settings):
        yield TestClient(app)

    app.dependency_overrides.clear()


@pytest.fixture
async def async_client():
    """Create async test client for async tests."""
    from cresco.agent.agent import get_agent
    from cresco.auth.dependencies import get_current_user
    from cresco.config import get_settings
    from cresco.main import app

    # Create mock agent
    mock_agent = AsyncMock()
    mock_agent.chat.return_value = {
        "answer": "Test async response",
        "sources": ["test.md"],
        "tasks": [],
    }

    # Create mock settings
    mock_settings = MagicMock()
    mock_settings.knowledge_base = Path("/tmp/kb")

    app.dependency_overrides[get_agent] = lambda: mock_agent
    app.dependency_overrides[get_settings] = lambda: mock_settings
    app.dependency_overrides[get_current_user] = lambda: {
        "user_id": "test-user-id",
        "username": "testuser",
        "is_admin": False,
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        with patch("cresco.api.routes.is_indexed", return_value=True):
            yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def sample_documents():
    """Create sample documents for testing."""
    from langchain_core.documents import Document

    return [
        Document(
            page_content="# Wheat Disease Guide\n\nSeptoria is a common disease...",
            metadata={"source": "/kb/wheat_disease.md", "filename": "wheat_disease.md"},
        ),
        Document(
            page_content="# Nutrient Management\n\nNitrogen is essential...",
            metadata={
                "source": "/kb/nutrient_guide.md",
                "filename": "nutrient_guide.md",
            },
        ),
        Document(
            page_content="# Organic Farming\n\nOrganic practices include...",
            metadata={"source": "/kb/organic.md", "filename": "organic.md"},
        ),
    ]


@pytest.fixture
def temp_knowledge_base():
    """Create a temporary knowledge base with test documents."""
    with tempfile.TemporaryDirectory() as tmpdir:
        kb_path = Path(tmpdir) / "knowledge_base"
        kb_path.mkdir(parents=True)

        # Create test markdown files
        (kb_path / "wheat_guide.md").write_text(
            "# Wheat Growth Guide\n\nWheat is a major crop in the UK..."
        )
        (kb_path / "disease_management.md").write_text(
            "# Disease Management\n\nSeptoria leaf blotch is common..."
        )
        (kb_path / "nutrient_guide.md").write_text(
            "# Nutrient Management\n\nNitrogen application rates..."
        )

        yield kb_path

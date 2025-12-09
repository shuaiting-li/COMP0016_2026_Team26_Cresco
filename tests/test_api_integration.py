"""Integration tests for the FastAPI endpoints."""

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Add project root to path for app module
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.main import app
from agritech_core.config import Settings


@pytest.fixture
def client():
    """Create a test client with offline mode enabled."""
    # Force offline mode for testing
    import os

    os.environ["LLM_MODE"] = "offline"

    with TestClient(app) as test_client:
        yield test_client


class TestHealthEndpoint:
    """Tests for the /health endpoint."""

    def test_health_returns_ok(self, client):
        """Health endpoint should return status ok."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestChatEndpoint:
    """Tests for the /chat endpoint."""

    def test_chat_returns_response(self, client):
        """Chat endpoint should return a valid response structure."""
        response = client.post(
            "/chat", json={"message": "How should I water my crops?"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert "tasks" in data
        assert "citations" in data
        assert isinstance(data["tasks"], list)
        assert isinstance(data["citations"], list)

    def test_chat_with_location(self, client):
        """Chat endpoint should accept optional location field."""
        response = client.post(
            "/chat",
            json={"message": "What pests should I watch for?", "location": "Kenya"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data

    def test_chat_with_farm_type(self, client):
        """Chat endpoint should accept optional farm_type field."""
        response = client.post(
            "/chat",
            json={"message": "How do I prepare for planting?", "farm_type": "maize"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data

    def test_chat_empty_message_rejected(self, client):
        """Chat endpoint should reject empty messages."""
        response = client.post("/chat", json={"message": ""})
        assert response.status_code == 422  # Validation error

    def test_chat_missing_message_rejected(self, client):
        """Chat endpoint should reject requests without message field."""
        response = client.post("/chat", json={})
        assert response.status_code == 422  # Validation error


class TestIngestEndpoint:
    """Tests for the /ingest endpoint."""

    def test_ingest_single_document(self, client):
        """Ingest endpoint should accept and process a single document."""
        response = client.post(
            "/ingest",
            json={
                "documents": [
                    {
                        "doc_id": "test-doc-1",
                        "text": "This is a test document about sustainable farming practices.",
                        "metadata": {"source": "test"},
                    }
                ]
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "chunks_added" in data
        assert data["chunks_added"] >= 1

    def test_ingest_multiple_documents(self, client):
        """Ingest endpoint should handle multiple documents."""
        response = client.post(
            "/ingest",
            json={
                "documents": [
                    {
                        "doc_id": "doc-a",
                        "text": "Document A content about crop rotation.",
                    },
                    {
                        "doc_id": "doc-b",
                        "text": "Document B content about soil health.",
                    },
                ]
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["chunks_added"] >= 2

    def test_ingest_auto_generates_doc_id(self, client):
        """Ingest endpoint should auto-generate doc_id if not provided."""
        response = client.post(
            "/ingest", json={"documents": [{"text": "Document without explicit ID."}]}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["chunks_added"] >= 1

    def test_ingest_empty_documents_list(self, client):
        """Ingest endpoint should handle empty documents list."""
        response = client.post("/ingest", json={"documents": []})
        assert response.status_code == 200
        data = response.json()
        assert data["chunks_added"] == 0


class TestEndToEndFlow:
    """End-to-end tests combining multiple operations."""

    def test_ingest_then_chat(self, client):
        """Ingested content should be retrievable via chat."""
        # Ingest a document
        client.post(
            "/ingest",
            json={
                "documents": [
                    {
                        "doc_id": "special-topic",
                        "text": "Banana trees require high humidity and consistent moisture. They grow best in tropical climates with temperatures between 26-30 degrees Celsius.",
                    }
                ]
            },
        )

        # Query about the ingested content
        response = client.post(
            "/chat", json={"message": "Tell me about growing bananas"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        # In offline mode, we can't verify semantic retrieval,
        # but we can verify the structure is correct
        assert isinstance(data["citations"], list)

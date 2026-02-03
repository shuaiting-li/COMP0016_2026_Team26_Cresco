"""Tests for API endpoints."""

import pytest
from fastapi.testclient import TestClient

from cresco.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


def test_health_endpoint(client):
    """Test health check endpoint returns correct structure."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert data["status"] == "healthy"


def test_chat_endpoint_requires_message(client):
    """Test chat endpoint validates request body."""
    response = client.post("/api/v1/chat", json={})
    assert response.status_code == 422  # Validation error


def test_chat_endpoint_rejects_empty_message(client):
    """Test chat endpoint rejects empty messages."""
    response = client.post("/api/v1/chat", json={"message": ""})
    assert response.status_code == 422

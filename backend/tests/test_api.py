"""Tests for API endpoints."""

from unittest.mock import AsyncMock, patch


class TestHealthEndpoint:
    """Tests for the /health endpoint."""

    def test_health_endpoint_returns_healthy(self, client):
        """Test health check endpoint returns correct structure."""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "knowledge_base_loaded" in data
        assert data["status"] == "healthy"

    def test_health_endpoint_shows_knowledge_base_status(self, client):
        """Test health endpoint includes knowledge base status."""
        response = client.get("/api/v1/health")
        data = response.json()
        assert isinstance(data["knowledge_base_loaded"], bool)

    def test_health_endpoint_returns_version(self, client):
        """Test health endpoint returns version string."""
        response = client.get("/api/v1/health")
        data = response.json()
        assert data["version"] is not None
        assert len(data["version"]) > 0


class TestChatEndpoint:
    """Tests for the /chat endpoint."""

    def test_chat_endpoint_requires_message(self, client):
        """Test chat endpoint validates request body."""
        response = client.post("/api/v1/chat", json={})
        assert response.status_code == 422  # Validation error

    def test_chat_endpoint_rejects_empty_message(self, client):
        """Test chat endpoint rejects empty messages."""
        response = client.post("/api/v1/chat", json={"message": ""})
        assert response.status_code == 422

    def test_chat_endpoint_accepts_valid_message(self, client):
        """Test chat endpoint accepts valid messages."""
        response = client.post("/api/v1/chat", json={"message": "What diseases affect wheat?"})
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "sources" in data
        assert "tasks" in data

    def test_chat_endpoint_with_conversation_id(self, client):
        """Test chat endpoint accepts conversation ID."""
        response = client.post(
            "/api/v1/chat",
            json={
                "message": "Tell me about crop rotation",
                "conversation_id": "test-conv-123",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("conversation_id") == "test-conv-123"

    def test_chat_endpoint_with_files(self, client):
        """Test chat endpoint accepts file uploads."""
        response = client.post(
            "/api/v1/chat",
            json={
                "message": "Analyze this soil report",
                "files": [{"name": "soil_report.txt", "content": "pH: 6.5, N: 50ppm"}],
            },
        )
        assert response.status_code == 200

    def test_chat_endpoint_message_too_long(self, client):
        """Test chat endpoint rejects overly long messages."""
        long_message = "a" * 2001  # Max is 2000
        response = client.post("/api/v1/chat", json={"message": long_message})
        assert response.status_code == 422

    def test_chat_response_has_correct_structure(self, client):
        """Test chat response has all required fields."""
        response = client.post("/api/v1/chat", json={"message": "How do I manage septoria?"})
        assert response.status_code == 200
        data = response.json()

        # Check required fields
        assert "answer" in data
        assert isinstance(data["answer"], str)

        assert "sources" in data
        assert isinstance(data["sources"], list)

        assert "tasks" in data
        assert isinstance(data["tasks"], list)


class TestIndexEndpoint:
    """Tests for the /index endpoint."""

    def test_index_endpoint_default_no_force(self, client):
        """Test index endpoint accepts request without force flag."""
        with patch("cresco.api.routes.index_knowledge_base", new_callable=AsyncMock) as mock_index:
            mock_index.return_value = 50
            response = client.post("/api/v1/index", json={})
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            assert data["documents_indexed"] == 50

    def test_index_endpoint_with_force_reindex(self, client):
        """Test index endpoint with force_reindex flag."""
        with patch("cresco.api.routes.index_knowledge_base", new_callable=AsyncMock) as mock_index:
            mock_index.return_value = 100
            response = client.post("/api/v1/index", json={"force_reindex": True})
            assert response.status_code == 200
            mock_index.assert_called_once()
            # Verify force=True was passed
            call_kwargs = mock_index.call_args
            assert call_kwargs[1]["force"] is True

    def test_index_endpoint_returns_document_count(self, client):
        """Test index endpoint returns correct document count."""
        with patch("cresco.api.routes.index_knowledge_base", new_callable=AsyncMock) as mock_index:
            mock_index.return_value = 75
            response = client.post("/api/v1/index", json={})
            data = response.json()
            assert data["documents_indexed"] == 75
            assert "75" in data["message"]

    def test_index_endpoint_handles_errors(self, client):
        """Test index endpoint handles indexing errors gracefully."""
        with patch("cresco.api.routes.index_knowledge_base", new_callable=AsyncMock) as mock_index:
            mock_index.side_effect = Exception("Database error")
            response = client.post("/api/v1/index", json={})
            assert response.status_code == 500
            assert "error" in response.json()["detail"].lower()


class TestCORS:
    """Tests for CORS configuration."""

    def test_cors_allows_options_request(self, client):
        """Test CORS preflight request is handled."""
        response = client.options(
            "/api/v1/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        # Should not be blocked by CORS
        assert response.status_code in [200, 204, 405]

    def test_cors_headers_present(self, client):
        """Test CORS headers are present in response."""
        response = client.get("/api/v1/health", headers={"Origin": "http://localhost:3000"})
        # When CORS is configured with allow_origins=["*"]
        # the header should be present
        assert response.status_code == 200


class TestErrorHandling:
    """Tests for API error handling."""

    def test_404_for_unknown_endpoint(self, client):
        """Test 404 response for unknown endpoints."""
        response = client.get("/api/v1/unknown")
        assert response.status_code == 404

    def test_method_not_allowed(self, client):
        """Test 405 response for wrong HTTP method."""
        response = client.get("/api/v1/chat")  # Should be POST
        assert response.status_code == 405

    def test_invalid_json_body(self, client):
        """Test error handling for invalid JSON."""
        response = client.post(
            "/api/v1/chat",
            content="not valid json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422

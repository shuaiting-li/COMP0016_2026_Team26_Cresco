"""Tests for API schemas (Pydantic models)."""

import pytest
from pydantic import ValidationError

from cresco.api.schemas import (
    ChatRequest,
    ChatResponse,
    HealthResponse,
    IndexRequest,
    IndexResponse,
)


class TestChatRequest:
    """Tests for ChatRequest schema."""

    def test_valid_message(self):
        """Test valid message is accepted."""
        request = ChatRequest(message="Hello, what crops grow in spring?")
        assert request.message == "Hello, what crops grow in spring?"

    def test_empty_message_rejected(self):
        """Test empty message raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            ChatRequest(message="")
        # Pydantic v2 uses "string_too_short" or "at least 1 character"
        error_str = str(exc_info.value).lower()
        assert "too_short" in error_str or "at least 1" in error_str

    def test_message_too_long_rejected(self):
        """Test message exceeding max length raises error."""
        long_message = "a" * 2001
        with pytest.raises(ValidationError) as exc_info:
            ChatRequest(message=long_message)
        # Pydantic v2 uses "string_too_long" or "at most 2000"
        error_str = str(exc_info.value).lower()
        assert "too_long" in error_str or "at most 2000" in error_str

    def test_message_at_max_length(self):
        """Test message at exactly max length is accepted."""
        max_message = "a" * 2000
        request = ChatRequest(message=max_message)
        assert len(request.message) == 2000

    def test_optional_conversation_id(self):
        """Test conversation_id is optional."""
        request = ChatRequest(message="Test message")
        assert request.conversation_id is None

    def test_with_conversation_id(self):
        """Test with conversation_id provided."""
        request = ChatRequest(message="Test message", conversation_id="conv-123")
        assert request.conversation_id == "conv-123"

    def test_optional_files(self):
        """Test files field is optional."""
        request = ChatRequest(message="Test message")
        assert request.files is None

    def test_with_files(self):
        """Test with files provided."""
        request = ChatRequest(
            message="Analyze this",
            files=[{"name": "test.txt", "content": "Test content"}],
        )
        assert len(request.files) == 1
        assert request.files[0]["name"] == "test.txt"

    def test_with_multiple_files(self):
        """Test with multiple files."""
        request = ChatRequest(
            message="Analyze these",
            files=[
                {"name": "file1.txt", "content": "Content 1"},
                {"name": "file2.txt", "content": "Content 2"},
            ],
        )
        assert len(request.files) == 2


class TestChatResponse:
    """Tests for ChatResponse schema."""

    def test_valid_response(self):
        """Test valid response creation."""
        response = ChatResponse(
            answer="This is the answer",
            sources=["doc1.md", "doc2.md"],
            tasks=[{"title": "Task 1", "detail": "Do this", "priority": "high"}],
        )
        assert response.answer == "This is the answer"
        assert len(response.sources) == 2
        assert len(response.tasks) == 1

    def test_answer_required(self):
        """Test answer field is required."""
        with pytest.raises(ValidationError):
            ChatResponse(sources=[], tasks=[])

    def test_default_empty_sources(self):
        """Test sources defaults to empty list."""
        response = ChatResponse(answer="Test answer")
        assert response.sources == []

    def test_default_empty_tasks(self):
        """Test tasks defaults to empty list."""
        response = ChatResponse(answer="Test answer")
        assert response.tasks == []

    def test_optional_conversation_id(self):
        """Test conversation_id is optional."""
        response = ChatResponse(answer="Test")
        assert response.conversation_id is None

    def test_with_conversation_id(self):
        """Test with conversation_id."""
        response = ChatResponse(answer="Test", conversation_id="conv-456")
        assert response.conversation_id == "conv-456"


class TestHealthResponse:
    """Tests for HealthResponse schema."""

    def test_valid_response(self):
        """Test valid health response."""
        response = HealthResponse(
            status="healthy", version="0.1.0", knowledge_base_loaded=True
        )
        assert response.status == "healthy"
        assert response.version == "0.1.0"
        assert response.knowledge_base_loaded is True

    def test_all_fields_required(self):
        """Test all fields are required."""
        with pytest.raises(ValidationError):
            HealthResponse(status="healthy")

    def test_knowledge_base_false(self):
        """Test knowledge_base_loaded can be False."""
        response = HealthResponse(
            status="healthy", version="0.1.0", knowledge_base_loaded=False
        )
        assert response.knowledge_base_loaded is False


class TestIndexRequest:
    """Tests for IndexRequest schema."""

    def test_default_no_force(self):
        """Test default force_reindex is False."""
        request = IndexRequest()
        assert request.force_reindex is False

    def test_force_reindex_true(self):
        """Test force_reindex can be True."""
        request = IndexRequest(force_reindex=True)
        assert request.force_reindex is True


class TestIndexResponse:
    """Tests for IndexResponse schema."""

    def test_valid_response(self):
        """Test valid index response."""
        response = IndexResponse(
            status="success", documents_indexed=100, message="Indexed 100 documents"
        )
        assert response.status == "success"
        assert response.documents_indexed == 100

    def test_all_fields_required(self):
        """Test all fields are required."""
        with pytest.raises(ValidationError):
            IndexResponse(status="success")

    def test_zero_documents(self):
        """Test zero documents indexed is valid."""
        response = IndexResponse(
            status="success", documents_indexed=0, message="No documents to index"
        )
        assert response.documents_indexed == 0

"""Pydantic schemas for API request/response models."""

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""

    message: str = Field(
        ..., min_length=1, max_length=2000, description="User's question"
    )
    conversation_id: str | None = Field(
        None, description="Optional conversation ID for context"
    )
    files: list[dict] | None = Field(
        None, description="Optional uploaded files with name and content"
    )


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""

    answer: str = Field(..., description="AI-generated response")
    sources: list[str] = Field(
        default_factory=list, description="Source documents used"
    )
    tasks: list[dict] = Field(
        default_factory=list, description="Suggested action plan tasks"
    )
    conversation_id: str | None = Field(
        None, description="Conversation ID for follow-up"
    )


class HealthResponse(BaseModel):
    """Response model for health check endpoint."""

    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    knowledge_base_loaded: bool = Field(
        ..., description="Whether knowledge base is indexed"
    )


class IndexRequest(BaseModel):
    """Request model for indexing endpoint."""

    force_reindex: bool = Field(
        False, description="Force re-indexing even if index exists"
    )


class IndexResponse(BaseModel):
    """Response model for indexing endpoint."""

    status: str = Field(..., description="Indexing status")
    documents_indexed: int = Field(..., description="Number of documents indexed")
    message: str = Field(..., description="Status message")

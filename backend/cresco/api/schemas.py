from pydantic import BaseModel, Field
from fastapi.responses import StreamingResponse


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""

    message: str = Field(..., min_length=1, max_length=2000, description="User's question")
    conversation_id: str | None = Field(None, description="Optional conversation ID for context")
    files: list[dict] | None = Field(
        None, description="Optional uploaded files with name and content"
    )


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""

    answer: str = Field(..., description="AI-generated response")
    sources: list[str] = Field(default_factory=list, description="Source documents used")
    tasks: list[dict] = Field(default_factory=list, description="Suggested action plan tasks")
    charts: list[dict] = Field(default_factory=list, description="Charts included in the response")
    conversation_id: str | None = Field(None, description="Conversation ID for follow-up")


class HealthResponse(BaseModel):
    """Response model for health check endpoint."""

    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    knowledge_base_loaded: bool = Field(..., description="Whether knowledge base is indexed")


class IndexRequest(BaseModel):
    """Request model for indexing endpoint."""

    force_reindex: bool = Field(False, description="Force re-indexing even if index exists")


class IndexResponse(BaseModel):
    """Response model for indexing endpoint."""

    status: str = Field(..., description="Indexing status")
    documents_indexed: int = Field(..., description="Number of documents indexed")
    message: str = Field(..., description="Status message")


class FileUploadResponse(BaseModel):
    """Response model for file upload endpoint."""

    filename: str = Field(..., description="Name of the uploaded file")
    status: str = Field(..., description="Upload status")
    chunks_indexed: int = Field(0, description="Number of vector store chunks indexed")


class FileDeleteResponse(BaseModel):
    """Response model for file delete endpoint."""

    filename: str = Field(..., description="Name of the deleted file")
    status: str = Field(..., description="Deletion status")
    chunks_removed: int = Field(..., description="Number of vector store chunks removed")


class UploadedFileInfo(BaseModel):
    """Single uploaded file entry."""

    name: str = Field(..., description="File name")


class UploadedFilesResponse(BaseModel):
    """Response model for listing uploaded files."""

    files: list[UploadedFileInfo] = Field(default_factory=list, description="Uploaded files")

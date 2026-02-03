"""API routes for Cresco chatbot."""

from fastapi import APIRouter, Depends, HTTPException

from cresco import __version__
from cresco.agent.agent import get_agent, CrescoAgent
from cresco.config import Settings, get_settings
from cresco.rag.indexer import index_knowledge_base, is_indexed

from .schemas import (
    ChatRequest,
    ChatResponse,
    HealthResponse,
    IndexRequest,
    IndexResponse,
)

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Check API health and knowledge base status."""
    return HealthResponse(
        status="healthy",
        version=__version__,
        knowledge_base_loaded=is_indexed(settings),
    )


@router.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(
    request: ChatRequest,
    agent: CrescoAgent = Depends(get_agent),
) -> ChatResponse:
    """Send a message to the Cresco chatbot."""
    try:
        # Build the message, including file context if files are uploaded
        message = request.message

        if request.files and len(request.files) > 0:
            file_context = "\n\n[Uploaded Files Context]:\n"
            for file in request.files:
                file_name = file.get("name", "unknown")
                file_content = file.get("content", "")
                file_context += f"\n--- {file_name} ---\n{file_content}\n"
            message = message + file_context

        result = await agent.chat(message)
        return ChatResponse(
            answer=result["answer"],
            sources=result.get("sources", []),
            tasks=result.get("tasks", []),
            conversation_id=request.conversation_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/index", response_model=IndexResponse, tags=["System"])
async def index_documents(
    request: IndexRequest,
    settings: Settings = Depends(get_settings),
) -> IndexResponse:
    """Index or re-index the knowledge base documents."""
    try:
        num_docs = await index_knowledge_base(settings, force=request.force_reindex)
        return IndexResponse(
            status="success",
            documents_indexed=num_docs,
            message=f"Successfully indexed {num_docs} document chunks",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Indexing error: {str(e)}")

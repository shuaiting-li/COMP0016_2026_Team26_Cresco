"""API routes for Cresco chatbot."""

from fastapi import APIRouter, Depends, HTTPException

from cresco import __version__
from cresco.agent.agent import get_agent, CrescoAgent
from cresco.config import Settings, get_settings
from cresco.rag.indexer import index_knowledge_base, is_indexed
import shutil
from pathlib import Path
from fastapi import UploadFile, File
from cresco.rag.indexer import index_knowledge_base

from .schemas import (
    ChatRequest,
    ChatResponse,
    HealthResponse,
    IndexRequest,
    IndexResponse,
    FileUploadResponse,
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
        print(f"Error during chat processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@router.post("/upload", response_model=FileUploadResponse, tags=["Files"])
async def upload_file(file: UploadFile = File(...),settings: Settings = Depends(get_settings)):
    try:
        upload_dir = settings.knowledge_base
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_path = upload_dir / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Trigger reindexing
        print(f"uploaded file: {file.filename}")

        await index_knowledge_base(settings, force=False, upload_file=file.filename) 
        print(f"ran index file: {file.filename}")
        
        return {"filename": file.filename, "status": "indexed"}
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


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

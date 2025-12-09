"""FastAPI entrypoint for the Agritech assistant backend."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from agritech_core import AgritechOrchestrator, get_settings
from agritech_core.rag import Document, KnowledgeBase
from agritech_core.schemas import (
    ChatRequest,
    ChatResponse,
    IngestRequest,
    IngestResponse,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    orchestrator = AgritechOrchestrator(settings=settings)
    knowledge_dir = Path(settings.knowledge_base_dir)
    if not knowledge_dir.exists():
        raise RuntimeError(f"Knowledge base directory not found: {knowledge_dir}")
    docs = KnowledgeBase.load_markdown_dir(knowledge_dir)
    if not docs:
        raise RuntimeError(f"No markdown documents found in {knowledge_dir}")
    chunks = orchestrator.ingest(docs)
    logger.info("Ingested %s knowledge chunks during startup", chunks)
    app.state.orchestrator = orchestrator
    try:
        yield
    finally:
        if hasattr(app.state, "orchestrator"):
            delattr(app.state, "orchestrator")


app = FastAPI(title="Agritech AI Assistant", version="0.1.0", lifespan=lifespan)

# CORS configuration for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_orchestrator(request: Request) -> AgritechOrchestrator:
    orchestrator = getattr(request.app.state, "orchestrator", None)
    if orchestrator is None:
        raise HTTPException(status_code=503, detail="Orchestrator not ready")
    return orchestrator


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest", response_model=IngestResponse)
def ingest_documents(
    payload: IngestRequest,
    orchestrator: AgritechOrchestrator = Depends(get_orchestrator),
) -> IngestResponse:
    documents: list[Document] = []
    for idx, doc in enumerate(payload.documents):
        metadata = doc.metadata or {}
        doc_id = doc.doc_id or f"user-doc-{idx}"
        documents.append(Document(doc_id=doc_id, text=doc.text, metadata=metadata))
    chunks = orchestrator.ingest(documents)
    return IngestResponse(chunks_added=chunks)


@app.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest, orchestrator: AgritechOrchestrator = Depends(get_orchestrator)
) -> ChatResponse:
    return orchestrator.handle_chat(request)

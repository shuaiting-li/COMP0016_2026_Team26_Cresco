"""Retriever configuration for RAG."""

from functools import lru_cache

from langchain_chroma import Chroma
from langchain_core.retrievers import BaseRetriever

from cresco.config import Settings, get_settings
from .embeddings import get_embeddings


@lru_cache
def get_retriever(settings: Settings = None) -> BaseRetriever:
    """Get the document retriever for RAG.

    Args:
        settings: Application settings. Uses default if not provided.

    Returns:
        Configured retriever instance.
    """
    if settings is None:
        settings = get_settings()

    vectorstore = Chroma(
        persist_directory=str(settings.chroma_path),
        embedding_function=get_embeddings(settings),
        collection_name="cresco_knowledge_base",
    )

    # Configure retriever with search parameters
    retriever = vectorstore.as_retriever(
        search_type="mmr",  # Maximum Marginal Relevance for diversity
        search_kwargs={
            "k": 5,  # Return top 5 documents
            "fetch_k": 10,  # Fetch 10, then select 5 diverse ones
        },
    )

    return retriever

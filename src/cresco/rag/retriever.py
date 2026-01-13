"""Vector store and retriever configuration for RAG."""

from langchain_chroma import Chroma
from langchain_core.retrievers import BaseRetriever

from cresco.config import get_settings
from .embeddings import get_embeddings

# Module-level singletons
_vector_store = None
_retriever = None


def get_vector_store() -> Chroma:
    """Get the Chroma vector store instance (singleton).

    Returns:
        Configured Chroma vector store instance.
    """
    global _vector_store
    if _vector_store is None:
        settings = get_settings()
        _vector_store = Chroma(
            persist_directory=str(settings.chroma_path),
            embedding_function=get_embeddings(),
            collection_name="cresco_knowledge_base",
        )
    return _vector_store


def get_retriever() -> BaseRetriever:
    """Get the document retriever for RAG (singleton).

    Returns:
        Configured retriever instance.
    """
    global _retriever
    if _retriever is None:
        vectorstore = get_vector_store()
        # Configure retriever with search parameters
        _retriever = vectorstore.as_retriever(
            search_type="mmr",  # Maximum Marginal Relevance for diversity
            search_kwargs={
                "k": 5,  # Return top 5 documents
                "fetch_k": 10,  # Fetch 10, then select 5 diverse ones
            },
        )
    return _retriever

"""Document indexing for the vector store."""

from langchain_chroma import Chroma

from cresco.config import Settings
from .document_loader import load_knowledge_base, split_documents
from .embeddings import get_embeddings


def is_indexed(settings: Settings) -> bool:
    """Check if the knowledge base has been indexed.

    Args:
        settings: Application settings.

    Returns:
        True if index exists and has documents.
    """
    chroma_path = settings.chroma_path

    if not chroma_path.exists():
        return False

    # Check if ChromaDB has any documents
    try:
        vectorstore = Chroma(
            persist_directory=str(chroma_path),
            embedding_function=get_embeddings(),
            collection_name="cresco_knowledge_base",
        )
        count = vectorstore._collection.count()
        return count > 0
    except Exception:
        return False


async def index_knowledge_base(settings: Settings, force: bool = False) -> int:
    """Index all knowledge base documents into ChromaDB.

    Args:
        settings: Application settings.
        force: If True, re-index even if index exists.

    Returns:
        Number of document chunks indexed.
    """
    chroma_path = settings.chroma_path

    # Check if already indexed
    if not force and is_indexed(settings):
        vectorstore = Chroma(
            persist_directory=str(chroma_path),
            embedding_function=get_embeddings(),
            collection_name="cresco_knowledge_base",
        )
        return vectorstore._collection.count()

    # Clear existing index if force re-index
    if force and chroma_path.exists():
        import shutil

        shutil.rmtree(chroma_path)

    # Create directory if needed
    chroma_path.mkdir(parents=True, exist_ok=True)

    # Load and split documents
    documents = load_knowledge_base(settings)
    chunks = split_documents(documents)

    # Create vector store with documents
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=get_embeddings(),
        persist_directory=str(chroma_path),
        collection_name="cresco_knowledge_base",
    )

    return len(chunks)

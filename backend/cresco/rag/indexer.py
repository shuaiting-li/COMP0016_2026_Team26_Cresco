"""Document indexing for the vector store."""

import asyncio
import logging

from cresco.config import Settings

from .document_loader import load_knowledge_base, load_user_documents, split_documents
from .retriever import get_vector_store, reset_vector_store

logger = logging.getLogger(__name__)

# Batch settings for rate limit handling
BATCH_SIZE = 100  # Number of documents per batch
BATCH_DELAY = 1.0  # Seconds to wait between batches


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

    # Check if ChromaDB has any documents (uses singleton vector store)
    try:
        vectorstore = get_vector_store()
        count = vectorstore._collection.count()
        return count > 0
    except Exception:
        return False


async def index_knowledge_base(
    settings: Settings, force: bool = False, upload_file: str = None
) -> int:
    """Index all knowledge base documents into ChromaDB.

    Args:
        settings: Application settings.
        force: If True, re-index even if index exists.
        upload_file: If provided, only index this specific file.

    Returns:
        Number of document chunks indexed.
    """
    chroma_path = settings.chroma_path

    # Check if already indexed
    if not force and is_indexed(settings) and not upload_file:
        vectorstore = get_vector_store()
        return vectorstore._collection.count()

    # Clear existing index if force re-index
    if force and chroma_path.exists():
        import shutil

        # Reset the singleton so it doesn't hold a stale connection
        reset_vector_store()
        shutil.rmtree(chroma_path)

    # Create directory if needed
    chroma_path.mkdir(parents=True, exist_ok=True)

    # Load and split documents
    documents = load_knowledge_base(settings)

    if upload_file:
        documents = [doc for doc in documents if doc.metadata.get("filename") == upload_file]

    chunks = split_documents(documents)

    logger.info("Loaded %d documents, split into %d chunks", len(documents), len(chunks))
    logger.info("Indexing in batches of %d with %.1fs delay...", BATCH_SIZE, BATCH_DELAY)

    # Use the singleton vector store (avoids multiple PersistentClient conflicts)
    vectorstore = get_vector_store()

    # Process in batches to avoid rate limits
    total_indexed = 0
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(chunks) + BATCH_SIZE - 1) // BATCH_SIZE

        logger.info("Batch %d/%d: %d chunks...", batch_num, total_batches, len(batch))

        try:
            # Add batch to vector store
            vectorstore.add_documents(batch)
            total_indexed += len(batch)
            logger.info("Batch %d OK", batch_num)

            # Delay between batches (except for the last one)
            if i + BATCH_SIZE < len(chunks):
                await asyncio.sleep(BATCH_DELAY)

        except Exception as e:
            logger.error("Batch %d error: %s", batch_num, e)
            # On rate limit, wait longer and retry
            if "rate" in str(e).lower() or "429" in str(e):
                logger.warning("Rate limited, waiting 30s...")
                await asyncio.sleep(30)
                try:
                    vectorstore.add_documents(batch)
                    total_indexed += len(batch)
                    logger.info("Retry successful")
                except Exception as retry_error:
                    logger.error("Retry failed: %s", retry_error)
                    raise

    logger.info("Indexed %d chunks successfully", total_indexed)
    return total_indexed


async def index_user_upload(settings: Settings, user_id: str, filename: str) -> int:
    """Index a single user-uploaded file into ChroamDB with user_id metadata.

    The file is loaded from the user's upload directory
    (``uploads_dir / user_id``), tagged with the user's ID so that
    retrieval can be scoped, and added to the shared ChromaDB collection.

    Args:
        settings: Application settings.
        user_id: The ID of the uploading user.
        filename: Name of the uploaded file to index.

    Returns:
        Number of document chunks indexed.
    """
    upload_dir = settings.uploads_dir / user_id
    documents = load_user_documents(upload_dir)

    # Keep only the requested file
    documents = [doc for doc in documents if doc.metadata.get("filename") == filename]

    # Stamp every chunk with the owning user
    for doc in documents:
        doc.metadata["user_id"] = user_id

    chunks = split_documents(documents)

    if not chunks:
        return 0

    logger.info(
        "Indexing user upload '%s' for user '%s': %d chunks",
        filename,
        user_id,
        len(chunks),
    )

    # Use the singleton vector store (avoids multiple PersistentClient conflicts)
    vectorstore = get_vector_store()

    total_indexed = 0
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        try:
            vectorstore.add_documents(batch)
            total_indexed += len(batch)
            if i + BATCH_SIZE < len(chunks):
                await asyncio.sleep(BATCH_DELAY)
        except Exception as e:
            if "rate" in str(e).lower() or "429" in str(e):
                await asyncio.sleep(30)
                vectorstore.add_documents(batch)
                total_indexed += len(batch)
            else:
                raise

    return total_indexed


def delete_user_upload(settings: Settings, user_id: str, filename: str) -> int:
    """Delete all chunks for a user-uploaded file from ChromaDB.

    Args:
        settings: Application settings.
        user_id: The ID of the owning user.
        filename: Name of the uploaded file whose chunks should be removed.

    Returns:
        Number of chunks deleted.
    """
    chroma_path = settings.chroma_path
    if not chroma_path.exists():
        return 0

    # Use the singleton vector store (avoids multiple PersistentClient conflicts)
    vectorstore = get_vector_store()

    # Find chunk IDs that match both user_id and filename
    results = vectorstore._collection.get(
        where={"$and": [{"user_id": user_id}, {"filename": filename}]},
    )
    ids_to_delete = results["ids"]

    if not ids_to_delete:
        return 0

    vectorstore._collection.delete(ids=ids_to_delete)
    logger.info(
        "Deleted %d chunks for file '%s' (user '%s')",
        len(ids_to_delete),
        filename,
        user_id,
    )
    return len(ids_to_delete)

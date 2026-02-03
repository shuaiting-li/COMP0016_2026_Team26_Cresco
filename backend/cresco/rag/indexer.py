"""Document indexing for the vector store."""

import asyncio
import time

from langchain_chroma import Chroma

from cresco.config import Settings
from .document_loader import load_knowledge_base, split_documents
from .embeddings import get_embeddings

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

    print(f"[*] Loaded {len(documents)} documents, split into {len(chunks)} chunks")
    print(f"[*] Indexing in batches of {BATCH_SIZE} with {BATCH_DELAY}s delay...")

    # Initialize empty vector store
    embeddings = get_embeddings()
    vectorstore = Chroma(
        persist_directory=str(chroma_path),
        embedding_function=embeddings,
        collection_name="cresco_knowledge_base",
    )

    # Process in batches to avoid rate limits
    total_indexed = 0
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(chunks) + BATCH_SIZE - 1) // BATCH_SIZE

        print(
            f"  [>] Batch {batch_num}/{total_batches}: {len(batch)} chunks...",
            end=" ",
            flush=True,
        )

        try:
            # Add batch to vector store
            vectorstore.add_documents(batch)
            total_indexed += len(batch)
            print("[OK]")

            # Delay between batches (except for the last one)
            if i + BATCH_SIZE < len(chunks):
                await asyncio.sleep(BATCH_DELAY)

        except Exception as e:
            print(f"[ERROR] {e}")
            # On rate limit, wait longer and retry
            if "rate" in str(e).lower() or "429" in str(e):
                print(f"  [!] Rate limited, waiting 30s...")
                await asyncio.sleep(30)
                try:
                    vectorstore.add_documents(batch)
                    total_indexed += len(batch)
                    print(f"  [OK] Retry successful")
                except Exception as retry_error:
                    print(f"  [ERROR] Retry failed: {retry_error}")
                    raise

    print(f"[*] Indexed {total_indexed} chunks successfully")
    return total_indexed

#!/usr/bin/env python3
"""Script to index knowledge base documents into ChromaDB."""

import asyncio
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

# Load .env file before importing config
from dotenv import load_dotenv

from cresco.config import get_settings
from cresco.rag.indexer import index_knowledge_base

load_dotenv()


async def main():
    """Run document indexing."""
    print("🌱 Cresco Document Indexer")
    print("=" * 40)

    settings = get_settings()

    print(f"📂 Knowledge base: {settings.knowledge_base}")
    print(f"💾 Vector store: {settings.chroma_path}")
    print()

    # Check for --force flag
    force = "--force" in sys.argv

    if force:
        print("⚠️  Force re-indexing enabled")

    print("📚 Indexing documents...")
    num_chunks = await index_knowledge_base(settings, force=force)

    print()
    print(f"✅ Successfully indexed {num_chunks} document chunks")
    print("🚀 Ready to start the chatbot!")


if __name__ == "__main__":
    asyncio.run(main())

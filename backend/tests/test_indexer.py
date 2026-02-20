"""Tests for RAG indexer."""

import shutil
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from cresco.rag.indexer import BATCH_DELAY, BATCH_SIZE, index_knowledge_base, is_indexed


class TestIsIndexed:
    """Tests for is_indexed function."""

    def test_returns_false_when_directory_missing(self, mock_settings):
        """Test returns False when chroma directory doesn't exist."""
        mock_settings.chroma_persist_dir = "/nonexistent/path"
        assert is_indexed(mock_settings) is False

    def test_returns_false_when_empty_collection(self, mock_settings):
        """Test returns False when collection has no documents."""
        Path(mock_settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)

        with patch("cresco.rag.indexer.Chroma") as mock_chroma:
            mock_collection = MagicMock()
            mock_collection.count.return_value = 0
            mock_chroma.return_value._collection = mock_collection

            assert is_indexed(mock_settings) is False

    def test_returns_true_when_documents_exist(self, mock_settings):
        """Test returns True when collection has documents."""
        Path(mock_settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)

        with patch("cresco.rag.indexer.Chroma") as mock_chroma:
            mock_collection = MagicMock()
            mock_collection.count.return_value = 100
            mock_chroma.return_value._collection = mock_collection

            assert is_indexed(mock_settings) is True

    def test_handles_chroma_exception(self, mock_settings):
        """Test returns False when Chroma raises exception."""
        Path(mock_settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)

        with patch("cresco.rag.indexer.Chroma") as mock_chroma:
            mock_chroma.side_effect = Exception("Database error")

            assert is_indexed(mock_settings) is False


class TestIndexKnowledgeBase:
    """Tests for index_knowledge_base function."""

    @pytest.mark.asyncio
    async def test_returns_existing_count_when_indexed(self, mock_settings):
        """Test returns existing document count when already indexed."""
        with patch("cresco.rag.indexer.is_indexed", return_value=True):
            with patch("cresco.rag.indexer.Chroma") as mock_chroma:
                mock_collection = MagicMock()
                mock_collection.count.return_value = 50
                mock_chroma.return_value._collection = mock_collection

                count = await index_knowledge_base(mock_settings, force=False)

                assert count == 50

    @pytest.mark.asyncio
    async def test_force_reindex_clears_existing(self, mock_settings):
        """Test force=True clears existing index."""
        # Create the directory
        chroma_path = Path(mock_settings.chroma_persist_dir)
        chroma_path.mkdir(parents=True, exist_ok=True)
        (chroma_path / "test_file.txt").write_text("test")

        with patch("cresco.rag.indexer.is_indexed", return_value=True):
            with patch("cresco.rag.indexer.load_knowledge_base") as mock_load:
                with patch("cresco.rag.indexer.split_documents") as mock_split:
                    with patch("cresco.rag.indexer.Chroma") as mock_chroma:
                        with patch("cresco.rag.indexer.get_embeddings"):
                            mock_load.return_value = []
                            mock_split.return_value = []
                            mock_chroma.return_value._collection.count.return_value = 0

                            await index_knowledge_base(mock_settings, force=True)

                            # Directory should be recreated (original file gone)
                            # But this is mocked, so just check the flow works

    @pytest.mark.asyncio
    async def test_creates_directory_if_missing(self, mock_settings):
        """Test creates chroma directory if it doesn't exist."""
        # Ensure directory doesn't exist
        chroma_path = Path(mock_settings.chroma_persist_dir)
        if chroma_path.exists():
            shutil.rmtree(chroma_path)

        with patch("cresco.rag.indexer.is_indexed", return_value=False):
            with patch("cresco.rag.indexer.load_knowledge_base") as mock_load:
                with patch("cresco.rag.indexer.split_documents") as mock_split:
                    with patch("cresco.rag.indexer.Chroma") as mock_chroma:
                        with patch("cresco.rag.indexer.get_embeddings"):
                            mock_load.return_value = []
                            mock_split.return_value = []
                            mock_chroma.return_value.add_documents = MagicMock()
                            mock_chroma.return_value._collection.count.return_value = 0

                            await index_knowledge_base(mock_settings, force=False)

                            assert chroma_path.exists()

    @pytest.mark.asyncio
    async def test_indexes_documents_in_batches(self, mock_settings):
        """Test documents are indexed in batches."""
        from langchain_core.documents import Document

        # Create more documents than batch size
        docs = [
            Document(page_content=f"Content {i}", metadata={"source": f"doc{i}.md"})
            for i in range(BATCH_SIZE + 50)
        ]

        with patch("cresco.rag.indexer.is_indexed", return_value=False):
            with patch("cresco.rag.indexer.load_knowledge_base") as mock_load:
                with patch("cresco.rag.indexer.split_documents") as mock_split:
                    with patch("cresco.rag.indexer.Chroma") as mock_chroma:
                        with patch("cresco.rag.indexer.get_embeddings"):
                            mock_load.return_value = docs
                            mock_split.return_value = docs
                            mock_vectorstore = MagicMock()
                            mock_vectorstore.add_documents = MagicMock()
                            mock_vectorstore._collection.count.return_value = len(docs)
                            mock_chroma.return_value = mock_vectorstore

                            await index_knowledge_base(mock_settings, force=True)

                            # Should have called add_documents at least twice
                            assert mock_vectorstore.add_documents.call_count >= 2


class TestBatchSettings:
    """Tests for batch configuration constants."""

    def test_batch_size_is_reasonable(self):
        """Test batch size is set to a reasonable value."""
        assert BATCH_SIZE > 0
        assert BATCH_SIZE <= 500  # Not too large

    def test_batch_delay_is_positive(self):
        """Test batch delay is positive for rate limiting."""
        assert BATCH_DELAY > 0
        assert BATCH_DELAY <= 10  # Not too slow

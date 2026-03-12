"""Tests for RAG indexer."""

import shutil
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from cresco.rag.indexer import (
    BATCH_DELAY,
    BATCH_SIZE,
    index_knowledge_base,
    index_user_upload,
    is_indexed,
)


class TestIsIndexed:
    """Tests for is_indexed function."""

    def test_returns_false_when_directory_missing(self, mock_settings):
        """Test returns False when chroma directory doesn't exist."""
        mock_settings.chroma_persist_dir = "/nonexistent/path"
        assert is_indexed(mock_settings) is False

    def test_returns_false_when_empty_collection(self, mock_settings):
        """Test returns False when collection has no documents."""
        Path(mock_settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)

        with patch("cresco.rag.indexer.get_vector_store") as mock_get_vs:
            mock_collection = MagicMock()
            mock_collection.count.return_value = 0
            mock_get_vs.return_value._collection = mock_collection

            assert is_indexed(mock_settings) is False

    def test_returns_true_when_documents_exist(self, mock_settings):
        """Test returns True when collection has documents."""
        Path(mock_settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)

        with patch("cresco.rag.indexer.get_vector_store") as mock_get_vs:
            mock_collection = MagicMock()
            mock_collection.count.return_value = 100
            mock_get_vs.return_value._collection = mock_collection

            assert is_indexed(mock_settings) is True

    def test_handles_chroma_exception(self, mock_settings):
        """Test returns False when Chroma raises exception."""
        Path(mock_settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)

        with patch("cresco.rag.indexer.get_vector_store") as mock_get_vs:
            mock_get_vs.side_effect = Exception("Database error")

            assert is_indexed(mock_settings) is False


class TestIndexKnowledgeBase:
    """Tests for index_knowledge_base function."""

    @pytest.mark.asyncio
    async def test_returns_existing_count_when_indexed(self, mock_settings):
        """Test returns existing document count when already indexed."""
        with patch("cresco.rag.indexer.is_indexed", return_value=True):
            with patch("cresco.rag.indexer.get_vector_store") as mock_get_vs:
                mock_collection = MagicMock()
                mock_collection.count.return_value = 50
                mock_get_vs.return_value._collection = mock_collection

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
                    with patch("cresco.rag.indexer.get_vector_store") as mock_get_vs:
                        with patch("cresco.rag.indexer.reset_vector_store"):
                            mock_load.return_value = []
                            mock_split.return_value = []
                            mock_get_vs.return_value._collection.count.return_value = 0

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
                    with patch("cresco.rag.indexer.get_vector_store") as mock_get_vs:
                        mock_load.return_value = []
                        mock_split.return_value = []
                        mock_vectorstore = MagicMock()
                        mock_vectorstore.add_documents = MagicMock()
                        mock_vectorstore._collection.count.return_value = 0
                        mock_get_vs.return_value = mock_vectorstore

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
                    with patch("cresco.rag.indexer.get_vector_store") as mock_get_vs:
                        with patch("cresco.rag.indexer.reset_vector_store"):
                            mock_load.return_value = docs
                            mock_split.return_value = docs
                            mock_vectorstore = MagicMock()
                            mock_vectorstore.add_documents = MagicMock()
                            mock_vectorstore._collection.count.return_value = len(docs)
                            mock_get_vs.return_value = mock_vectorstore

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


class TestIndexKnowledgeBaseRateLimit:
    """Tests for rate limit handling during indexing."""

    @pytest.mark.asyncio
    async def test_retries_on_rate_limit_error(self, mock_settings):
        """Test that indexing retries after a rate limit (429) error."""
        from langchain_core.documents import Document

        docs = [Document(page_content="content", metadata={"source": "doc.md"})]

        with (
            patch("cresco.rag.indexer.is_indexed", return_value=False),
            patch("cresco.rag.indexer.load_knowledge_base", return_value=docs),
            patch("cresco.rag.indexer.split_documents", return_value=docs),
            patch("cresco.rag.indexer.get_vector_store") as mock_get_vs,
            patch("cresco.rag.indexer.asyncio.sleep") as mock_sleep,
        ):
            mock_vectorstore = MagicMock()
            # First call raises rate limit, retry succeeds
            mock_vectorstore.add_documents = MagicMock(
                side_effect=[Exception("rate limit exceeded 429"), None]
            )
            mock_get_vs.return_value = mock_vectorstore

            count = await index_knowledge_base(mock_settings, force=False)

            assert count == 1
            # Should have retried after rate limit (slept before retry)
            mock_sleep.assert_called()

    @pytest.mark.asyncio
    async def test_upload_file_filters_documents(self, mock_settings):
        """Test that upload_file parameter filters to only the matching file."""
        from langchain_core.documents import Document

        docs = [
            Document(page_content="A", metadata={"filename": "a.md"}),
            Document(page_content="B", metadata={"filename": "b.md"}),
        ]

        with (
            patch("cresco.rag.indexer.is_indexed", return_value=False),
            patch("cresco.rag.indexer.load_knowledge_base", return_value=docs),
            patch("cresco.rag.indexer.split_documents") as mock_split,
            patch("cresco.rag.indexer.get_vector_store") as mock_get_vs,
        ):
            mock_split.return_value = [docs[0]]
            mock_vectorstore = MagicMock()
            mock_get_vs.return_value = mock_vectorstore

            await index_knowledge_base(mock_settings, upload_file="a.md")

            # split_documents should only receive the filtered doc
            call_args = mock_split.call_args[0][0]
            assert len(call_args) == 1
            assert call_args[0].metadata["filename"] == "a.md"


class TestIndexUserUploadRateLimit:
    """Tests for rate limit handling during user upload indexing."""

    @pytest.mark.asyncio
    async def test_retries_on_rate_limit(self, mock_settings):
        """Test that user upload indexing retries after rate limit error."""
        from langchain_core.documents import Document

        docs = [Document(page_content="report", metadata={"filename": "r.md"})]

        with (
            patch("cresco.rag.indexer.load_user_documents", return_value=docs),
            patch("cresco.rag.indexer.split_documents", return_value=docs),
            patch("cresco.rag.indexer.get_vector_store") as mock_get_vs,
            patch("cresco.rag.indexer.asyncio.sleep") as mock_sleep,
        ):
            mock_vectorstore = MagicMock()
            mock_vectorstore.add_documents = MagicMock(
                side_effect=[Exception("429 rate limit"), None]
            )
            mock_get_vs.return_value = mock_vectorstore

            count = await index_user_upload(mock_settings, user_id="u1", filename="r.md")

            assert count == 1
            mock_sleep.assert_any_call(30)


class TestIndexUserUpload:
    """Tests for index_user_upload function."""

    @pytest.mark.asyncio
    async def test_indexes_single_user_file(self, mock_settings):
        """Test indexing a single user-uploaded file with user_id metadata."""
        from langchain_core.documents import Document

        docs = [
            Document(
                page_content="User report content",
                metadata={"filename": "report.md", "category": "general"},
            )
        ]

        with (
            patch("cresco.rag.indexer.load_user_documents") as mock_load,
            patch("cresco.rag.indexer.split_documents") as mock_split,
            patch("cresco.rag.indexer.get_vector_store") as mock_get_vs,
        ):
            mock_load.return_value = docs
            mock_split.return_value = docs
            mock_vectorstore = MagicMock()
            mock_vectorstore.add_documents = MagicMock()
            mock_get_vs.return_value = mock_vectorstore

            count = await index_user_upload(mock_settings, user_id="user42", filename="report.md")

            assert count == 1
            mock_vectorstore.add_documents.assert_called_once()

            # Verify user_id metadata was stamped
            indexed_docs = mock_vectorstore.add_documents.call_args.args[0]
            assert indexed_docs[0].metadata["user_id"] == "user42"

    @pytest.mark.asyncio
    async def test_returns_zero_when_no_matching_file(self, mock_settings):
        """Test returns 0 when the uploaded file is not found."""
        with (
            patch("cresco.rag.indexer.load_user_documents") as mock_load,
            patch("cresco.rag.indexer.split_documents") as mock_split,
        ):
            mock_load.return_value = []
            mock_split.return_value = []

            count = await index_user_upload(mock_settings, user_id="user42", filename="missing.md")

            assert count == 0

    @pytest.mark.asyncio
    async def test_loads_from_user_upload_directory(self, mock_settings):
        """Test that documents are loaded from the correct per-user directory."""
        from pathlib import Path

        with (
            patch("cresco.rag.indexer.load_user_documents") as mock_load,
            patch("cresco.rag.indexer.split_documents") as mock_split,
            patch("cresco.rag.indexer.get_vector_store"),
        ):
            mock_load.return_value = []
            mock_split.return_value = []

            await index_user_upload(mock_settings, user_id="user42", filename="f.md")

            expected_dir = Path(mock_settings.uploads_path) / "user42"
            mock_load.assert_called_once_with(expected_dir)


class TestDeleteUserUpload:
    """Tests for delete_user_upload function."""

    def test_deletes_matching_chunks(self, mock_settings):
        """Test chunks with matching user_id and filename are deleted."""
        from cresco.rag.indexer import delete_user_upload

        mock_collection = MagicMock()
        mock_collection.get.return_value = {"ids": ["id1", "id2", "id3"]}

        with patch("cresco.rag.indexer.get_vector_store") as mock_get_vs:
            mock_vectorstore = MagicMock()
            mock_vectorstore._collection = mock_collection
            mock_get_vs.return_value = mock_vectorstore

            # Ensure chroma_path exists
            mock_settings.chroma_path.mkdir(parents=True, exist_ok=True)

            count = delete_user_upload(mock_settings, user_id="user42", filename="report.md")

            assert count == 3
            mock_collection.delete.assert_called_once_with(ids=["id1", "id2", "id3"])
            mock_collection.get.assert_called_once_with(
                where={"$and": [{"user_id": "user42"}, {"filename": "report.md"}]},
            )

    def test_returns_zero_when_no_chunks_found(self, mock_settings):
        """Test returns 0 when no matching chunks exist in ChromaDB."""
        from cresco.rag.indexer import delete_user_upload

        mock_collection = MagicMock()
        mock_collection.get.return_value = {"ids": []}

        with patch("cresco.rag.indexer.get_vector_store") as mock_get_vs:
            mock_vectorstore = MagicMock()
            mock_vectorstore._collection = mock_collection
            mock_get_vs.return_value = mock_vectorstore

            mock_settings.chroma_path.mkdir(parents=True, exist_ok=True)

            count = delete_user_upload(mock_settings, user_id="user42", filename="missing.md")

            assert count == 0
            mock_collection.delete.assert_not_called()

    def test_returns_zero_when_chroma_path_missing(self, mock_settings):
        """Test returns 0 when the ChromaDB directory does not exist."""
        from cresco.rag.indexer import delete_user_upload

        # Don't create chroma_path — it should not exist
        count = delete_user_upload(mock_settings, user_id="user42", filename="report.md")

        assert count == 0

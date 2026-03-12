"""Tests for RAG document loader."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.documents import Document

from cresco.rag.document_loader import (
    SHARED_USER_ID,
    _categorize_document,
    _load_documents_from_dir,
    load_knowledge_base,
    load_user_documents,
    split_documents,
)


class TestCategorizeDocument:
    """Tests for document categorization."""

    def test_disease_management_category(self):
        """Test disease-related files are categorized correctly."""
        assert _categorize_document("wheat_disease_guide.md") == "disease_management"
        assert _categorize_document("Pest_Control.md") == "disease_management"
        assert _categorize_document("fungicide_application.md") == "disease_management"

    def test_crop_guides_category(self):
        """Test crop guide files are categorized correctly."""
        assert _categorize_document("Wheat_Growth_Guide.md") == "crop_guides"
        assert _categorize_document("oat_cultivation.md") == "crop_guides"
        assert _categorize_document("barley_guide.md") == "crop_guides"

    def test_nutrient_management_category(self):
        """Test nutrient files are categorized correctly."""
        assert _categorize_document("nutrient_application.md") == "nutrient_management"
        assert _categorize_document("fertilizer_recommendations.md") == "nutrient_management"
        assert _categorize_document("deficiency_symptoms.md") == "nutrient_management"

    def test_seeds_standards_category(self):
        """Test seed/standard files are categorized correctly."""
        assert _categorize_document("seed_certification.md") == "seeds_standards"
        # Note: "quality_standards.md" matches "standard" before "guide"
        assert _categorize_document("quality_standards.md") == "seeds_standards"

    def test_grain_storage_category(self):
        """Test storage files are categorized correctly."""
        # Note: files with "guide" in name match crop_guides first
        # Use filenames that only match grain/storage
        assert _categorize_document("grain_store.md") == "grain_storage"
        assert _categorize_document("storage_best_practices.md") == "grain_storage"

    def test_organic_farming_category(self):
        """Test organic files are categorized correctly."""
        assert _categorize_document("organic_practices.md") == "organic_farming"

    def test_general_category_fallback(self):
        """Test uncategorized files default to general."""
        assert _categorize_document("random_document.md") == "general"
        assert _categorize_document("other_info.md") == "general"

    def test_case_insensitive(self):
        """Test categorization is case-insensitive."""
        assert _categorize_document("DISEASE_GUIDE.md") == "disease_management"
        assert _categorize_document("Wheat_GROWTH.md") == "crop_guides"


class TestLoadKnowledgeBase:
    """Tests for knowledge base loading."""

    def test_raises_error_for_missing_directory(self, mock_settings):
        """Test error is raised when knowledge base doesn't exist."""
        # Remove the directory
        import shutil

        if Path(mock_settings.knowledge_base_path).exists():
            shutil.rmtree(mock_settings.knowledge_base_path)

        with pytest.raises(FileNotFoundError) as exc_info:
            load_knowledge_base(mock_settings)
        assert "not found" in str(exc_info.value).lower()

    def test_loads_documents_from_directory(self, temp_knowledge_base, mock_settings):
        """Test documents are loaded from knowledge base."""
        mock_settings.knowledge_base_path = str(temp_knowledge_base)

        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_loader:
            mock_docs = [
                MagicMock(
                    page_content="Test content",
                    metadata={"source": str(temp_knowledge_base / "test.md")},
                )
            ]
            mock_loader.return_value.load.return_value = mock_docs

            documents = load_knowledge_base(mock_settings)

            assert mock_loader.called
            assert len(documents) > 0

    def test_adds_filename_metadata(self, temp_knowledge_base, mock_settings):
        """Test filename is added to document metadata."""
        mock_settings.knowledge_base_path = str(temp_knowledge_base)

        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_loader:
            mock_doc = MagicMock()
            mock_doc.page_content = "Test content"
            mock_doc.metadata = {"source": str(temp_knowledge_base / "wheat_guide.md")}
            mock_loader.return_value.load.return_value = [mock_doc]

            documents = load_knowledge_base(mock_settings)

            assert documents[0].metadata.get("filename") == "wheat_guide.md"

    def test_adds_category_metadata(self, temp_knowledge_base, mock_settings):
        """Test category is added to document metadata."""
        mock_settings.knowledge_base_path = str(temp_knowledge_base)

        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_loader:
            mock_doc = MagicMock()
            mock_doc.page_content = "Test content"
            mock_doc.metadata = {"source": str(temp_knowledge_base / "disease_guide.md")}
            mock_loader.return_value.load.return_value = [mock_doc]

            documents = load_knowledge_base(mock_settings)

            assert documents[0].metadata.get("category") == "disease_management"

    def test_stamps_shared_user_id(self, temp_knowledge_base, mock_settings):
        """Test shared knowledge base docs are stamped with SHARED_USER_ID."""
        mock_settings.knowledge_base_path = str(temp_knowledge_base)

        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_loader:
            mock_doc = MagicMock()
            mock_doc.page_content = "Test content"
            mock_doc.metadata = {"source": str(temp_knowledge_base / "test.md")}
            mock_loader.return_value.load.return_value = [mock_doc]

            documents = load_knowledge_base(mock_settings)

            assert documents[0].metadata["user_id"] == SHARED_USER_ID


class TestLoadUserDocuments:
    """Tests for user document loading."""

    def test_returns_empty_for_missing_directory(self, tmp_path):
        """Test returns empty list when directory doesn't exist."""
        result = load_user_documents(tmp_path / "nonexistent")
        assert result == []

    def test_loads_documents_from_user_directory(self, tmp_path):
        """Test documents are loaded from user upload directory."""
        user_dir = tmp_path / "user1"
        user_dir.mkdir()
        (user_dir / "report.md").write_text("# My Report\nSome content")

        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_loader:
            mock_doc = MagicMock()
            mock_doc.page_content = "# My Report\nSome content"
            mock_doc.metadata = {"source": str(user_dir / "report.md")}
            mock_loader.return_value.load.return_value = [mock_doc]

            documents = load_user_documents(user_dir)

            assert len(documents) > 0
            assert documents[0].metadata["filename"] == "report.md"

    def test_forwards_filename_to_loader(self, tmp_path):
        """Test filename parameter is forwarded to _load_documents_from_dir."""
        user_dir = tmp_path / "user1"
        user_dir.mkdir()

        with patch("cresco.rag.document_loader._load_documents_from_dir") as mock_load:
            mock_load.return_value = []
            load_user_documents(user_dir, filename="report.pdf")

            mock_load.assert_called_once_with(user_dir, filename="report.pdf")

    def test_does_not_stamp_user_id(self, tmp_path):
        """Test load_user_documents does NOT set user_id — caller is responsible."""
        user_dir = tmp_path / "user1"
        user_dir.mkdir()

        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_loader:
            mock_doc = MagicMock()
            mock_doc.page_content = "content"
            mock_doc.metadata = {"source": str(user_dir / "file.txt")}
            mock_loader.return_value.load.return_value = [mock_doc]

            documents = load_user_documents(user_dir)

            # user_id should NOT be set by load_user_documents
            assert "user_id" not in documents[0].metadata


class TestLoadDocumentsFromDir:
    """Tests for the _load_documents_from_dir helper."""

    def test_uses_text_loader_for_text_files(self, tmp_path):
        """Test that text-based extensions use TextLoader."""
        (tmp_path / "notes.md").write_text("# Notes")

        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_dir:
            mock_dir.return_value.load.return_value = []
            _load_documents_from_dir(tmp_path)

            # At least one call should reference TextLoader
            called = any(
                "TextLoader" in str(c)
                for c in mock_dir.call_args_list
            )
            assert called, "Expected at least one DirectoryLoader call with TextLoader"

    def test_uses_pypdf_loader_for_pdf_files(self, tmp_path):
        """Test that .pdf extension uses PyPDFLoader instead of TextLoader."""
        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_dir:
            mock_dir.return_value.load.return_value = []
            _load_documents_from_dir(tmp_path)

            # Find the call that handles PDF files
            pdf_calls = [
                c
                for c in mock_dir.call_args_list
                if "**/*.pdf" in str(c)
            ]
            assert len(pdf_calls) == 1
            # Verify it uses PyPDFLoader
            assert "PyPDFLoader" in str(pdf_calls[0])

    def test_single_filename_uses_specific_glob(self, tmp_path):
        """Test that filename param uses a specific glob with PyPDFLoader."""
        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_dir:
            mock_dir.return_value.load.return_value = []
            _load_documents_from_dir(tmp_path, filename="report.pdf")

            mock_dir.assert_called_once()
            call_kwargs = mock_dir.call_args.kwargs
            assert call_kwargs["glob"] == "**/report.pdf"
            assert call_kwargs["loader_cls"].__name__ == "PyPDFLoader"

    def test_single_filename_text_uses_text_loader(self, tmp_path):
        """Test that filename param with text extension uses TextLoader."""
        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_dir:
            mock_dir.return_value.load.return_value = []
            _load_documents_from_dir(tmp_path, filename="notes.md")

            mock_dir.assert_called_once()
            call_kwargs = mock_dir.call_args.kwargs
            assert call_kwargs["glob"] == "**/notes.md"
            assert call_kwargs["loader_cls"].__name__ == "TextLoader"

    def test_single_filename_unknown_ext_returns_empty(self, tmp_path):
        """Test that unsupported extension returns empty list."""
        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_dir:
            result = _load_documents_from_dir(tmp_path, filename="image.png")

            mock_dir.assert_not_called()
            assert result == []

    def test_pdf_loader_has_no_encoding_kwarg(self, tmp_path):
        """Test that PyPDFLoader calls don't pass encoding (binary loader)."""
        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_dir:
            mock_dir.return_value.load.return_value = []
            _load_documents_from_dir(tmp_path)

            pdf_calls = [
                c
                for c in mock_dir.call_args_list
                if "**/*.pdf" in str(c)
            ]
            assert len(pdf_calls) == 1
            # loader_kwargs with encoding should NOT be present
            assert "loader_kwargs" not in pdf_calls[0].kwargs


class TestSilentErrorHandling:
    """Tests for silent_errors=True on DirectoryLoader calls."""

    def test_text_loader_uses_silent_errors(self, tmp_path):
        """Test that text-based DirectoryLoader calls pass silent_errors=True."""
        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_dir:
            mock_dir.return_value.load.return_value = []
            _load_documents_from_dir(tmp_path)

            text_calls = [
                c
                for c in mock_dir.call_args_list
                if c.kwargs.get("loader_cls").__name__ == "TextLoader"
            ]
            assert len(text_calls) > 0
            for call in text_calls:
                assert call.kwargs.get("silent_errors") is True

    def test_pdf_loader_uses_silent_errors(self, tmp_path):
        """Test that PDF DirectoryLoader calls pass silent_errors=True."""
        with patch("cresco.rag.document_loader.DirectoryLoader") as mock_dir:
            mock_dir.return_value.load.return_value = []
            _load_documents_from_dir(tmp_path)

            pdf_calls = [c for c in mock_dir.call_args_list if c.kwargs.get("glob") == "**/*.pdf"]
            assert len(pdf_calls) == 1
            assert pdf_calls[0].kwargs.get("silent_errors") is True


class TestSplitDocuments:
    """Tests for document splitting."""

    def test_splits_documents_into_chunks(self, sample_documents):
        """Test documents are split into chunks."""
        chunks = split_documents(sample_documents)
        assert len(chunks) >= 1
        # Verify chunks contain text from the originals
        all_text = " ".join(c.page_content for c in chunks)
        assert "Septoria" in all_text or "Nitrogen" in all_text

    def test_adds_chunk_index_metadata(self, sample_documents):
        """Test chunk index is added to metadata."""
        chunks = split_documents(sample_documents)
        for i, chunk in enumerate(chunks):
            assert "chunk_index" in chunk.metadata
            assert chunk.metadata["chunk_index"] == i

    def test_preserves_original_metadata(self, sample_documents):
        """Test original metadata is preserved in chunks."""
        # Add custom metadata
        sample_documents[0].metadata["custom_field"] = "test_value"

        chunks = split_documents(sample_documents)

        # At least one chunk should have the custom metadata
        custom_chunks = [c for c in chunks if c.metadata.get("custom_field") == "test_value"]
        assert len(custom_chunks) > 0

    def test_chunk_size_reasonable(self, sample_documents):
        """Test chunks are within reasonable size limits."""
        chunks = split_documents(sample_documents)
        for chunk in chunks:
            # Chunk size is set to 1500 with 200 overlap
            # Allow some flexibility for edge cases
            assert len(chunk.page_content) <= 2000

    def test_empty_documents_list(self):
        """Test handling of empty documents list."""
        chunks = split_documents([])
        assert chunks == []

    def test_single_document(self):
        """Test splitting a single small document."""
        doc = Document(page_content="Short content", metadata={"source": "test.md"})
        chunks = split_documents([doc])
        assert len(chunks) >= 1
        assert chunks[0].page_content == "Short content"

    def test_large_document_split(self):
        """Test large document is split into multiple chunks."""
        # Create a document larger than chunk size
        large_content = "This is a test paragraph. " * 200  # ~5000 chars
        doc = Document(page_content=large_content, metadata={"source": "large.md"})

        chunks = split_documents([doc])

        # Should be split into multiple chunks
        assert len(chunks) > 1

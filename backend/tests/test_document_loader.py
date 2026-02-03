"""Tests for RAG document loader."""

import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from langchain_core.documents import Document

from cresco.rag.document_loader import (
    load_knowledge_base,
    split_documents,
    _categorize_document,
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
        assert (
            _categorize_document("fertilizer_recommendations.md")
            == "nutrient_management"
        )
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
            mock_doc.metadata = {
                "source": str(temp_knowledge_base / "disease_guide.md")
            }
            mock_loader.return_value.load.return_value = [mock_doc]

            documents = load_knowledge_base(mock_settings)

            assert documents[0].metadata.get("category") == "disease_management"


class TestSplitDocuments:
    """Tests for document splitting."""

    def test_splits_documents_into_chunks(self, sample_documents):
        """Test documents are split into chunks."""
        chunks = split_documents(sample_documents)
        # Should have at least as many chunks as documents (possibly more)
        assert len(chunks) >= len(sample_documents)

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
        custom_chunks = [
            c for c in chunks if c.metadata.get("custom_field") == "test_value"
        ]
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

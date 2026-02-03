"""Tests for RAG retriever and vector store."""

import pytest
from unittest.mock import patch, MagicMock

from cresco.rag.retriever import get_vector_store, get_retriever


class TestGetVectorStore:
    """Tests for get_vector_store function."""

    def test_returns_chroma_instance(self):
        """Test returns a Chroma vector store instance."""
        # Reset singleton
        import cresco.rag.retriever as retriever_module

        retriever_module._vector_store = None

        with patch("cresco.rag.retriever.Chroma") as mock_chroma:
            with patch("cresco.rag.retriever.get_embeddings"):
                with patch("cresco.rag.retriever.get_settings") as mock_settings:
                    mock_settings.return_value.chroma_path = "/tmp/chroma"

                    store = get_vector_store()

                    assert mock_chroma.called

    def test_singleton_pattern(self):
        """Test vector store is a singleton."""
        import cresco.rag.retriever as retriever_module

        retriever_module._vector_store = None

        with patch("cresco.rag.retriever.Chroma") as mock_chroma:
            with patch("cresco.rag.retriever.get_embeddings"):
                with patch("cresco.rag.retriever.get_settings") as mock_settings:
                    mock_settings.return_value.chroma_path = "/tmp/chroma"
                    mock_chroma.return_value = MagicMock()

                    store1 = get_vector_store()
                    store2 = get_vector_store()

                    # Should only create once
                    assert mock_chroma.call_count == 1
                    assert store1 is store2

    def test_uses_correct_collection_name(self):
        """Test uses cresco_knowledge_base collection."""
        import cresco.rag.retriever as retriever_module

        retriever_module._vector_store = None

        with patch("cresco.rag.retriever.Chroma") as mock_chroma:
            with patch("cresco.rag.retriever.get_embeddings"):
                with patch("cresco.rag.retriever.get_settings") as mock_settings:
                    mock_settings.return_value.chroma_path = "/tmp/chroma"

                    get_vector_store()

                    call_kwargs = mock_chroma.call_args[1]
                    assert call_kwargs["collection_name"] == "cresco_knowledge_base"


class TestGetRetriever:
    """Tests for get_retriever function."""

    def test_returns_retriever(self):
        """Test returns a retriever instance."""
        import cresco.rag.retriever as retriever_module

        retriever_module._vector_store = None
        retriever_module._retriever = None

        with patch("cresco.rag.retriever.get_vector_store") as mock_get_store:
            mock_store = MagicMock()
            mock_retriever = MagicMock()
            mock_store.as_retriever.return_value = mock_retriever
            mock_get_store.return_value = mock_store

            retriever = get_retriever()

            assert retriever is mock_retriever

    def test_singleton_pattern(self):
        """Test retriever is a singleton."""
        import cresco.rag.retriever as retriever_module

        retriever_module._vector_store = None
        retriever_module._retriever = None

        with patch("cresco.rag.retriever.get_vector_store") as mock_get_store:
            mock_store = MagicMock()
            mock_retriever = MagicMock()
            mock_store.as_retriever.return_value = mock_retriever
            mock_get_store.return_value = mock_store

            retriever1 = get_retriever()
            retriever2 = get_retriever()

            # Should only call as_retriever once
            assert mock_store.as_retriever.call_count == 1
            assert retriever1 is retriever2

    def test_uses_mmr_search_type(self):
        """Test retriever uses MMR search for diversity."""
        import cresco.rag.retriever as retriever_module

        retriever_module._vector_store = None
        retriever_module._retriever = None

        with patch("cresco.rag.retriever.get_vector_store") as mock_get_store:
            mock_store = MagicMock()
            mock_get_store.return_value = mock_store

            get_retriever()

            call_kwargs = mock_store.as_retriever.call_args[1]
            assert call_kwargs["search_type"] == "mmr"

    def test_retriever_search_params(self):
        """Test retriever has correct search parameters."""
        import cresco.rag.retriever as retriever_module

        retriever_module._vector_store = None
        retriever_module._retriever = None

        with patch("cresco.rag.retriever.get_vector_store") as mock_get_store:
            mock_store = MagicMock()
            mock_get_store.return_value = mock_store

            get_retriever()

            call_kwargs = mock_store.as_retriever.call_args[1]
            assert call_kwargs["search_kwargs"]["k"] == 5
            assert call_kwargs["search_kwargs"]["fetch_k"] == 10

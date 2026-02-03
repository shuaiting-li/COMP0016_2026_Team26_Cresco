"""Tests for RAG embeddings."""

import pytest
from unittest.mock import patch, MagicMock

from cresco.rag.embeddings import get_embeddings


class TestGetEmbeddings:
    """Tests for get_embeddings function."""

    def test_returns_embeddings_instance(self):
        """Test returns an embeddings instance."""
        import cresco.rag.embeddings as embeddings_module

        embeddings_module._embeddings = None

        with patch("cresco.rag.embeddings.AzureOpenAIEmbeddings") as mock_embeddings:
            with patch("cresco.rag.embeddings.get_settings") as mock_settings:
                mock_settings.return_value.azure_openai_embedding_deployment = (
                    "test-embed"
                )
                mock_settings.return_value.azure_openai_endpoint = (
                    "https://test.azure.com"
                )
                mock_settings.return_value.azure_openai_api_version = "2024-08-01"

                embeddings = get_embeddings()

                assert mock_embeddings.called

    def test_singleton_pattern(self):
        """Test embeddings is a singleton."""
        import cresco.rag.embeddings as embeddings_module

        embeddings_module._embeddings = None

        with patch("cresco.rag.embeddings.AzureOpenAIEmbeddings") as mock_embeddings:
            with patch("cresco.rag.embeddings.get_settings") as mock_settings:
                mock_settings.return_value.azure_openai_embedding_deployment = (
                    "test-embed"
                )
                mock_settings.return_value.azure_openai_endpoint = (
                    "https://test.azure.com"
                )
                mock_settings.return_value.azure_openai_api_version = "2024-08-01"
                mock_embeddings.return_value = MagicMock()

                emb1 = get_embeddings()
                emb2 = get_embeddings()

                assert mock_embeddings.call_count == 1
                assert emb1 is emb2

    def test_uses_azure_settings(self):
        """Test uses Azure OpenAI settings from config."""
        import cresco.rag.embeddings as embeddings_module

        embeddings_module._embeddings = None

        with patch("cresco.rag.embeddings.AzureOpenAIEmbeddings") as mock_embeddings:
            with patch("cresco.rag.embeddings.get_settings") as mock_settings:
                mock_settings.return_value.azure_openai_embedding_deployment = (
                    "my-deployment"
                )
                mock_settings.return_value.azure_openai_endpoint = (
                    "https://my-endpoint.azure.com"
                )
                mock_settings.return_value.azure_openai_api_version = (
                    "2024-08-01-preview"
                )

                get_embeddings()

                call_kwargs = mock_embeddings.call_args[1]
                assert call_kwargs["azure_deployment"] == "my-deployment"
                assert call_kwargs["azure_endpoint"] == "https://my-endpoint.azure.com"
                assert call_kwargs["api_version"] == "2024-08-01-preview"

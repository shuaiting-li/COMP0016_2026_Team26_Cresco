"""Embeddings configuration for Cresco."""

from langchain_openai import AzureOpenAIEmbeddings

from cresco.config import get_settings

# Module-level singleton
_embeddings = None


def get_embeddings() -> AzureOpenAIEmbeddings:
    """Get the Azure OpenAI embeddings model (singleton).

    Returns:
        Configured AzureOpenAIEmbeddings instance.
    """
    global _embeddings
    if _embeddings is None:
        settings = get_settings()
        # API key is automatically picked up from AZURE_OPENAI_API_KEY env var
        _embeddings = AzureOpenAIEmbeddings(
            azure_deployment=settings.azure_openai_embedding_deployment,
            azure_endpoint=settings.azure_openai_endpoint,
            api_version=settings.azure_openai_api_version,
        )
    return _embeddings

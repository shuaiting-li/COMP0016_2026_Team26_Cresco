"""Embeddings configuration for Cresco."""

from langchain_google_genai import GoogleGenerativeAIEmbeddings

from cresco.config import get_settings

# Module-level singleton
_embeddings = None


def get_embeddings() -> GoogleGenerativeAIEmbeddings:
    """Get the Google Generative AI embeddings model (singleton).

    Returns:
        Configured GoogleGenerativeAIEmbeddings instance.
    """
    global _embeddings
    if _embeddings is None:
        settings = get_settings()
        # API key is automatically picked up from GOOGLE_API_KEY env var
        _embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.embedding_model,
        )
    return _embeddings

"""Embeddings configuration for Cresco."""

from functools import lru_cache

from langchain_openai import OpenAIEmbeddings

from cresco.config import Settings, get_settings


@lru_cache
def get_embeddings(settings: Settings = None) -> OpenAIEmbeddings:
    """Get the OpenAI embeddings model.

    Args:
        settings: Application settings. Uses default if not provided.

    Returns:
        Configured OpenAIEmbeddings instance.
    """
    if settings is None:
        settings = get_settings()

    return OpenAIEmbeddings(
        model=settings.embedding_model,
        api_key=settings.openai_api_key,
    )

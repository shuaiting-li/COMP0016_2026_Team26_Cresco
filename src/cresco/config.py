"""Configuration settings for Cresco."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # OpenAI settings
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"

    # ChromaDB settings
    chroma_persist_dir: str = "./data/chroma_db"

    # Knowledge base
    knowledge_base_path: str = "./data/knowledge_base"

    # API settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True

    @property
    def chroma_path(self) -> Path:
        """Get ChromaDB persist directory as Path."""
        return Path(self.chroma_persist_dir)

    @property
    def knowledge_base(self) -> Path:
        """Get knowledge base directory as Path."""
        return Path(self.knowledge_base_path)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

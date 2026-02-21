"""Configuration settings for Cresco."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Model settings (API keys are read directly from env by LangChain)
    # Supported providers: openai, google-genai, anthropic, azure-openai, etc.
    model_provider: str = "azure-openai"
    model_name: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-ada-002"

    # Azure OpenAI settings (required when model_provider=azure-openai)
    azure_openai_endpoint: str = ""
    azure_openai_api_version: str = "2024-08-01-preview"
    azure_openai_deployment: str = ""  # Chat model deployment name
    azure_openai_embedding_deployment: str = ""  # Embedding model deployment name

    # ChromaDB settings
    chroma_persist_dir: str = "./data/chroma_db"

    # Knowledge base
    knowledge_base_path: str = "./data/knowledge_base"

    # API settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True

    # Auth settings
    jwt_secret_key: str = ""  # Required — set JWT_SECRET_KEY in .env
    jwt_expiry_hours: int = 24
    users_file: str = "./data/users.json"

    # Third-party API keys
    openweather_api_key: str = ""  # Set OPENWEATHER_API_KEY in .env

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

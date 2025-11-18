"""Application configuration helpers."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Literal

from dotenv import load_dotenv

load_dotenv()


@dataclass(slots=True)
class Settings:
    """Container for runtime configuration."""

    environment: str = field(
        default_factory=lambda: os.getenv("APP_ENV", "development")
    )
    gemini_api_key: str | None = field(
        default_factory=lambda: os.getenv("GEMINI_API_KEY")
    )
    llm_mode: Literal["gemini", "offline"] = field(
        default_factory=lambda: os.getenv("LLM_MODE", "gemini").lower() or "gemini"
    )
    llm_model: str = field(
        default_factory=lambda: os.getenv("GEMINI_MODEL", "models/gemini-2.5-flash")
    )
    embedding_model: str = field(
        default_factory=lambda: os.getenv(
            "GEMINI_EMBEDDING_MODEL", "models/text-embedding-004"
        )
    )
    rag_top_k: int = field(default_factory=lambda: int(os.getenv("RAG_TOP_K", 4)))
    max_history: int = field(default_factory=lambda: int(os.getenv("MAX_HISTORY", 6)))
    chunk_size: int = field(default_factory=lambda: int(os.getenv("CHUNK_SIZE", 500)))
    chunk_overlap: int = field(
        default_factory=lambda: int(os.getenv("CHUNK_OVERLAP", 50))
    )

    def offline_mode(self) -> bool:
        return self.llm_mode != "gemini" or not self.gemini_api_key


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()

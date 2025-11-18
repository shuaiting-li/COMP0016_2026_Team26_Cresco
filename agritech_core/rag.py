"""RAG pipeline primitives."""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, List, Sequence

import numpy as np

from .config import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass
class Document:
    doc_id: str
    text: str
    metadata: dict[str, str | int | float] = field(default_factory=dict)


@dataclass
class Chunk:
    chunk_id: str
    text: str
    metadata: dict[str, str | int | float]


@dataclass
class RetrievedChunk:
    chunk_id: str
    score: float
    text: str
    metadata: dict[str, str | int | float]


class TextChunker:
    def __init__(self, chunk_size: int, overlap: int) -> None:
        self.chunk_size = chunk_size
        self.overlap = overlap

    def split(self, document: Document) -> list[Chunk]:
        chunks: list[Chunk] = []
        start = 0
        text = document.text.strip()
        while start < len(text):
            end = min(len(text), start + self.chunk_size)
            chunk_text = text[start:end]
            chunk_id = f"{document.doc_id}-{len(chunks)}"
            chunk_meta = document.metadata | {"source_doc": document.doc_id}
            chunks.append(Chunk(chunk_id=chunk_id, text=chunk_text, metadata=chunk_meta))
            start = end - self.overlap
            if start < 0:
                start = 0
            if end == len(text):
                break
        return chunks


class BaseEmbeddingClient:
    def embed(self, texts: Sequence[str]) -> list[list[float]]:  # pragma: no cover - interface
        raise NotImplementedError


class LocalEmbeddingClient(BaseEmbeddingClient):
    """Deterministic hashing fallback for offline development."""

    def __init__(self, dim: int = 256) -> None:
        self.dim = dim

    def _seed_from_text(self, text: str) -> np.ndarray:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        ints = np.frombuffer(digest, dtype=np.uint8)
        expanded = np.resize(ints, self.dim)
        norm = np.linalg.norm(expanded)
        if norm == 0:  # pragma: no cover - extremely unlikely
            return expanded
        normalized = expanded / norm
        return normalized

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        return [self._seed_from_text(text).tolist() for text in texts]


def _extract_embedding_values(payload: Any) -> list[float]:
    """Normalize Gemini responses into a float list."""

    embedding: Any = None
    if isinstance(payload, dict):
        embedding = payload.get("embedding")
    else:
        embedding = getattr(payload, "embedding", None)
    if embedding is None:
        raise ValueError("Gemini response missing 'embedding'")

    values: Any = None
    if isinstance(embedding, dict):
        values = embedding.get("values")
    else:
        values = getattr(embedding, "values", embedding if isinstance(embedding, list) else None)
    if values is None:
        raise ValueError("Gemini embedding missing values")
    return [float(v) for v in values]


class GeminiEmbeddingClient(BaseEmbeddingClient):
    """Embedding client backed by the Gemini API."""

    def __init__(self, api_key: str, model: str) -> None:
        try:
            import google.generativeai as genai
        except ImportError as exc:  # pragma: no cover - dependency guard
            raise RuntimeError("google-generativeai package missing") from exc

        if not api_key:
            raise ValueError("GEMINI_API_KEY is required for Gemini embeddings")

        genai.configure(api_key=api_key)
        self._genai = genai
        self._model = model

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        embeddings: list[list[float]] = []
        for text in texts:
            result = self._genai.embed_content(model=self._model, content=text)
            embeddings.append(_extract_embedding_values(result))
        return embeddings


class SimpleVectorStore:
    def __init__(self) -> None:
        self._vectors: list[np.ndarray] = []
        self._chunks: list[Chunk] = []

    @staticmethod
    def _normalize(vector: np.ndarray) -> np.ndarray:
        norm = np.linalg.norm(vector)
        if norm == 0:
            return vector
        return vector / norm

    def add(self, embeddings: Sequence[list[float]], chunks: Sequence[Chunk]) -> None:
        for emb, chunk in zip(embeddings, chunks):
            vector = np.array(emb, dtype=np.float32)
            self._vectors.append(self._normalize(vector))
            self._chunks.append(chunk)

    def similarity_search(self, query_embedding: list[float], top_k: int) -> list[RetrievedChunk]:
        if not self._vectors:
            return []
        query = self._normalize(np.array(query_embedding, dtype=np.float32))
        scores = np.dot(np.vstack(self._vectors), query)
        best_indices = np.argsort(scores)[::-1][:top_k]
        results: list[RetrievedChunk] = []
        for idx in best_indices:
            chunk = self._chunks[int(idx)]
            score = float(scores[int(idx)])
            results.append(
                RetrievedChunk(
                    chunk_id=chunk.chunk_id,
                    score=score,
                    text=chunk.text,
                    metadata=chunk.metadata,
                )
            )
        return results


class KnowledgeBase:
    """High-level interface for ingestion and retrieval."""

    def __init__(
        self,
        settings: Settings | None = None,
        embedding_client: BaseEmbeddingClient | None = None,
        vector_store: SimpleVectorStore | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        if embedding_client:
            self.embedding_client = embedding_client
        elif self.settings.offline_mode():
            logger.warning("Falling back to LocalEmbeddingClient (offline mode)")
            self.embedding_client = LocalEmbeddingClient()
        else:
            self.embedding_client = GeminiEmbeddingClient(
                api_key=self.settings.gemini_api_key or "",
                model=self.settings.embedding_model,
            )
        self.vector_store = vector_store or SimpleVectorStore()
        self.chunker = TextChunker(self.settings.chunk_size, self.settings.chunk_overlap)

    def ingest(self, documents: Iterable[Document]) -> int:
        chunk_buffer: list[Chunk] = []
        for doc in documents:
            chunk_buffer.extend(self.chunker.split(doc))
        if not chunk_buffer:
            return 0
        embeddings = self.embedding_client.embed([chunk.text for chunk in chunk_buffer])
        self.vector_store.add(embeddings, chunk_buffer)
        return len(chunk_buffer)

    def retrieve(self, query: str, top_k: int | None = None) -> list[RetrievedChunk]:
        if not query.strip():
            return []
        embeddings = self.embedding_client.embed([query])
        return self.vector_store.similarity_search(embeddings[0], top_k or self.settings.rag_top_k)

    @staticmethod
    def load_markdown_dir(path: str | Path) -> list[Document]:
        docs: list[Document] = []
        directory = Path(path)
        for idx, file in enumerate(sorted(directory.glob("*.md"))):
            text = file.read_text(encoding="utf-8")
            docs.append(Document(doc_id=file.stem or f"doc-{idx}", text=text, metadata={"path": str(file)}))
        return docs

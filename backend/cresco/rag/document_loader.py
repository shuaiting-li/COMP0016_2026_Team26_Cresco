"""Document loader for the agricultural knowledge base."""

from pathlib import Path

from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader, TextLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from cresco.config import Settings

# Supported file extensions for knowledge base ingestion
SUPPORTED_EXTENSIONS = [".md", ".pdf", ".txt", ".csv", ".json"]

# Extensions that require a binary loader instead of TextLoader
_PDF_EXTENSIONS = {".pdf"}
_TEXT_EXTENSIONS = [ext for ext in SUPPORTED_EXTENSIONS if ext not in _PDF_EXTENSIONS]

# Sentinel value used to tag shared knowledge-base docs in the vector store
SHARED_USER_ID = "__shared__"


def load_knowledge_base(settings: Settings) -> list[Document]:
    """Load all supported text documents from the knowledge base directory.

    Args:
        settings: Application settings containing knowledge base path.

    Returns:
        List of Document objects ready for embedding.
    """
    kb_path = settings.knowledge_base

    if not kb_path.exists():
        raise FileNotFoundError(f"Knowledge base directory not found: {kb_path}")

    documents = _load_documents_from_dir(kb_path)

    # Add metadata to each document
    for doc in documents:
        source_path = Path(doc.metadata.get("source", ""))
        doc.metadata["filename"] = source_path.name
        doc.metadata["category"] = _categorize_document(source_path.name)
        doc.metadata["user_id"] = SHARED_USER_ID

    return documents


def load_user_documents(upload_dir: Path) -> list[Document]:
    """Load documents from a user-specific upload directory.

    Args:
        upload_dir: Path to the user's upload directory.

    Returns:
        List of Document objects ready for embedding.
    """
    if not upload_dir.exists():
        return []

    documents = _load_documents_from_dir(upload_dir)

    for doc in documents:
        source_path = Path(doc.metadata.get("source", ""))
        doc.metadata["filename"] = source_path.name
        doc.metadata["category"] = _categorize_document(source_path.name)
        # user_id is set by the caller (indexer) after loading

    return documents


def _load_documents_from_dir(directory: Path) -> list[Document]:
    """Load documents from a directory using the appropriate loader per file type.

    Text-based files (.md, .txt, .csv, .json) are loaded with ``TextLoader``.
    PDF files are loaded with ``PyPDFLoader`` which handles binary content.

    Args:
        directory: Path to the directory to scan.

    Returns:
        List of raw Document objects (metadata enrichment is left to callers).
    """
    documents: list[Document] = []

    # Text-based files
    for ext in _TEXT_EXTENSIONS:
        loader = DirectoryLoader(
            str(directory),
            glob=f"**/*{ext}",
            loader_cls=TextLoader,
            loader_kwargs={"encoding": "utf-8"},
            show_progress=True,
            silent_errors=True,
        )
        documents.extend(loader.load())

    # PDF files (binary — cannot use TextLoader)
    for ext in _PDF_EXTENSIONS:
        loader = DirectoryLoader(
            str(directory),
            glob=f"**/*{ext}",
            loader_cls=PyPDFLoader,
            show_progress=True,
            silent_errors=True,
        )
        documents.extend(loader.load())

    return documents


def split_documents(documents: list[Document]) -> list[Document]:
    """Split documents into chunks for embedding.

    Args:
        documents: List of loaded documents.

    Returns:
        List of chunked documents.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,
        chunk_overlap=200,
        length_function=len,
        separators=[
            "\n---\n",  # Section breaks in the markdown files
            "\n## ",  # Major headers
            "\n### ",  # Sub headers
            "\n\n",  # Paragraphs
            "\n",  # Lines
            " ",  # Words
        ],
    )

    chunks = splitter.split_documents(documents)

    # Add chunk index to metadata
    for i, chunk in enumerate(chunks):
        chunk.metadata["chunk_index"] = i

    return chunks


def _categorize_document(filename: str) -> str:
    """Categorize a document based on its filename.

    Args:
        filename: Name of the markdown file.

    Returns:
        Category string.
    """
    filename_lower = filename.lower()

    if any(term in filename_lower for term in ["disease", "pest", "fungicide"]):
        return "disease_management"
    elif any(term in filename_lower for term in ["growth", "guide", "wheat", "oat", "barley"]):
        return "crop_guides"
    elif any(term in filename_lower for term in ["nutri", "fertilizer", "deficiency"]):
        return "nutrient_management"
    elif any(term in filename_lower for term in ["seed", "certification", "standard"]):
        return "seeds_standards"
    elif any(term in filename_lower for term in ["storage", "grain"]):
        return "grain_storage"
    elif any(term in filename_lower for term in ["organic"]):
        return "organic_farming"
    else:
        return "general"

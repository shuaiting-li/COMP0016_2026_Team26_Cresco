# System Architecture

This document describes the architecture and design of the Agritech Assistant backend system.

## Overview

The Agritech Assistant is a FastAPI-based backend service that provides an intelligent agricultural advisory system using Large Language Models (LLM) and Retrieval-Augmented Generation (RAG).

```
┌─────────────┐
│   Client    │
│ (Web/Mobile)│
└──────┬──────┘
       │ HTTP/JSON
       ▼
┌─────────────────────────────────────┐
│          FastAPI Server             │
│  ┌────────────────────────-─────┐   │
│  │   API Endpoints              │   │
│  │  • POST /chat                │   │
│  │  • POST /ingest              │   │
│  │  • GET  /health              │   │
│  └────────┬───────────-─────────┘   │
└───────────┼─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│    Agritech Orchestrator            │
│  ┌──────────┐  ┌──────────┐         │
│  │ Planner  │  │   RAG    │         │
│  │  Agent   │  │  Agent   │         │
│  └────┬─────┘  └────┬─────┘         │
│       │             │               │
│       └─────┬───────┘               │
│             ▼                       │
│       ┌──────────┐                  │
│       │   Chat   │                  │
│       │  Agent   │                  │
│       └────┬─────┘                  │
└────────────┼────────────────────────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
┌────────┐ ┌────┐ ┌─────────┐
│  LLM   │ │RAG │ │ Memory  │
│Client  │ │KB  │ │ Buffer  │
└────────┘ └────┘ └─────────┘
    │        │
    ▼        ▼
┌────────┐ ┌──────────────┐
│ Gemini │ │Vector Store  │
│  API   │ │+ Embeddings  │
└────────┘ └──────────────┘
```

## Component Architecture

### 1. API Layer (`app/`)

**File**: `app/main.py`

**Responsibilities**:
- HTTP request/response handling
- Request validation via Pydantic schemas
- Dependency injection
- Application lifecycle management

**Endpoints**:
```python
GET  /health              # Health check
POST /chat                # Chat with the assistant
POST /ingest              # Add documents to knowledge base
```

**Design Patterns**:
- Dependency Injection (FastAPI's `Depends()`)
- Single Responsibility (each endpoint does one thing)

---

### 2. Core Business Logic (`agritech_core/`)

#### 2.1 Orchestrator (`agents.py`)

**Class**: `AgritechOrchestrator`

**Purpose**: Coordinates all agents and manages the conversation flow.

**Responsibilities**:
- Manage agent lifecycle
- Coordinate request flow through agents
- Aggregate responses from multiple agents

**Flow**:
```
User Message → Planner Agent → RAG Agent → Chat Agent → Response
                    ↓              ↓            ↓
                 Actions       Context      Final Reply
```

**Code Example**:
```python
def handle_chat(self, request: ChatRequest) -> ChatResponse:
    # 1. Get planner recommendations
    actions = self.planner.build_actions(request)
    
    # 2. Retrieve relevant knowledge
    rag_result = self.rag_agent.search(request.message)
    
    # 3. Generate response with LLM
    reply = self.chat_agent.respond(request, rag_result, actions)
    
    return ChatResponse(reply=reply, tasks=actions, citations=rag_result.citations)
```

#### 2.2 Planner Agent (`agents.py`)

**Class**: `PlannerAgent`

**Purpose**: Generate actionable tasks and recommendations for farmers.

**Current Implementation**: Rule-based keyword matching
- Searches for keywords like "irrig", "water", etc.
- Returns pre-defined action templates
- Adds location-based weather tasks
- Creates goal follow-up tasks

**Limitations** (see CODEX_REVIEW.md):
- Not actually AI-powered
- Brittle string matching
- Limited task variety

**Future Improvement**: Replace with LLM-based planning.

#### 2.3 RAG Agent (`agents.py`)

**Class**: `RAGAgent`

**Purpose**: Retrieve relevant information from the knowledge base.

**Responsibilities**:
- Query the vector store
- Format retrieved chunks for LLM context
- Track citations

**Flow**:
```
User Query → Embedding → Vector Search → Top-K Chunks → Format Context
```

#### 2.4 Chat Agent (`agents.py`)

**Class**: `ChatAgent`

**Purpose**: Generate natural language responses using LLM.

**Responsibilities**:
- Build prompts with context, history, and recommendations
- Call LLM to generate responses
- Update conversation memory

**Prompt Structure**:
```
System Instructions
↓
Retrieved Context (from RAG)
↓
Conversation History
↓
Planner Recommendations
↓
Current User Message
```

---

### 3. LLM Client Layer (`llm.py`)

**Base Interface**: `BaseLLMClient`

**Implementations**:

#### 3.1 `GeminiTextClient`
- Integrates with Google's Gemini API
- Configurable model and parameters
- Used in production mode

#### 3.2 `OfflineLLMClient`
- Stub implementation for development
- Returns echoed prompt fragments
- No API calls or costs

**Design Pattern**: Strategy Pattern (swappable implementations)

**Selection Logic**:
```python
if settings.offline_mode():
    return OfflineLLMClient()
else:
    return GeminiTextClient(api_key, model)
```

---

### 4. RAG Pipeline (`rag.py`)

#### 4.1 Knowledge Base (`KnowledgeBase`)

**Purpose**: High-level interface for document ingestion and retrieval.

**Components**:
- Text Chunker
- Embedding Client
- Vector Store

**Workflow**:
```
Document → Split to Chunks → Generate Embeddings → Store Vectors
Query → Generate Embedding → Similarity Search → Return Top-K
```

#### 4.2 Text Chunker (`TextChunker`)

**Algorithm**: Fixed-size overlapping windows

**Parameters**:
- `chunk_size`: Characters per chunk (default: 500)
- `overlap`: Characters overlapping between chunks (default: 50)

**Limitations**:
- Splits mid-sentence/mid-word
- No semantic awareness
- Destroys markdown formatting

#### 4.3 Embedding Clients

**Base Interface**: `BaseEmbeddingClient`

**Implementations**:

##### `GeminiEmbeddingClient`
- Uses Gemini embedding models
- Default: `text-embedding-004`
- Produces semantic vectors

##### `LocalEmbeddingClient`
- SHA256 hash-based (non-semantic)
- Used for offline development
- **Not suitable for production**

#### 4.4 Vector Store (`SimpleVectorStore`)

**Algorithm**: Brute-force cosine similarity

**Operations**:
- `add(embeddings, chunks)`: Store vectors
- `similarity_search(query, top_k)`: Find similar chunks

**Implementation**:
```python
# Normalize vectors
normalized = vector / ||vector||

# Compute cosine similarity
scores = dot(stored_vectors, query_vector)

# Return top-K highest scores
```

**Limitations**:
- O(n) search complexity
- No indexing or optimization
- Memory-based only (no persistence)

---

### 5. Memory Management (`memory.py`)

**Class**: `ConversationMemory`

**Purpose**: Maintain conversation context across turns.

**Implementation**: Fixed-size deque (FIFO)

**Parameters**:
- `max_turns`: Number of turns to remember (default: 6)

**Storage Format**:
```python
[
    {"role": "user", "content": "How to water crops?"},
    {"role": "assistant", "content": "Water early morning..."},
    ...
]
```

**Limitations**:
- No summarization of old context
- No user-specific memory (shared global state)
- No persistence across restarts
- No token counting

---

### 6. Configuration (`config.py`)

**Class**: `Settings`

**Purpose**: Centralized configuration management.

**Sources**:
1. Environment variables
2. `.env` file (via `python-dotenv`)
3. Default values

**Pattern**: Singleton via `@lru_cache`

```python
@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
```

**Configuration Options**: See [SETUP.md](SETUP.md) for full reference.

---

### 7. Schemas (`schemas.py`)

**Purpose**: Request/response models using Pydantic.

**Models**:

```python
# API Requests
ChatRequest        # User message + optional context
IngestRequest      # Documents to add

# API Responses  
ChatResponse       # Reply + tasks + citations
IngestResponse     # Number of chunks added

# Internal Models
PlannerAction      # Task recommendation
DocumentPayload    # Document to ingest
```

**Benefits**:
- Type safety
- Automatic validation
- OpenAPI schema generation
- Clear API contracts

---

## Data Flow

### Chat Request Flow

```
1. Client → POST /chat
   {
     "message": "How to control pests?",
     "location": "Kenya"
   }

2. FastAPI validates with Pydantic → ChatRequest

3. Orchestrator.handle_chat(request)
   │
   ├─→ PlannerAgent.build_actions(request)
   │    └─→ Returns: [Action{title, detail, priority}]
   │
   ├─→ RAGAgent.search(request.message)
   │    ├─→ KnowledgeBase.retrieve(query, top_k)
   │    │    ├─→ EmbeddingClient.embed(query)
   │    │    └─→ VectorStore.similarity_search(embedding)
   │    └─→ Returns: RAGResult{context, citations, chunks}
   │
   └─→ ChatAgent.respond(request, rag_result, actions)
        ├─→ Build prompt (system + context + history + actions + query)
        ├─→ LLMClient.generate(prompt)
        ├─→ Memory.add(user_message, assistant_reply)
        └─→ Returns: reply string

4. Orchestrator aggregates → ChatResponse
   {
     "reply": "For pest control in Kenya...",
     "tasks": [{...}],
     "citations": ["pest_management.md"]
   }

5. FastAPI serializes → JSON response to client
```

### Document Ingestion Flow

```
1. Client → POST /ingest
   {
     "documents": [{
       "doc_id": "fertilizer",
       "text": "Apply NPK 50kg/ha...",
       "metadata": {"source": "manual"}
     }]
   }

2. Orchestrator.ingest(documents)
   │
   └─→ KnowledgeBase.ingest(documents)
        ├─→ TextChunker.split(doc) → chunks
        ├─→ EmbeddingClient.embed(chunk_texts) → embeddings
        └─→ VectorStore.add(embeddings, chunks)

3. Returns: IngestResponse{chunks_added: N}
```

---

## Technology Stack

### Backend Framework
- **FastAPI**: Modern async web framework
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation

### AI/ML
- **Google Gemini**: LLM and embeddings
- **NumPy**: Vector operations

### Development
- **pytest**: Testing framework
- **httpx**: HTTP client for tests
- **python-dotenv**: Environment management

### Deployment
- Python 3.10+
- Virtual environment (venv)
- Environment variables for config

---

## Design Patterns Used

1. **Dependency Injection**: FastAPI's `Depends()`
2. **Strategy Pattern**: Swappable LLM/embedding clients
3. **Repository Pattern**: KnowledgeBase abstracts storage
4. **Factory Pattern**: `build_llm()`, `LLMFactory`
5. **Singleton**: Settings via `@lru_cache`
6. **Data Transfer Objects**: Pydantic schemas

---

## Security Architecture

### Current State
⚠️ **Multiple security issues** - See [CODEX_REVIEW.md](CODEX_REVIEW.md)

### Missing Security Features
- [ ] Authentication/Authorization
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] Input sanitization
- [ ] Secrets management
- [ ] HTTPS enforcement
- [ ] Request size limits

---

## Scalability Considerations

### Current Limitations
- **Single-threaded**: Global orchestrator state
- **Memory-only**: No persistent storage
- **O(n) search**: Vector store scales poorly
- **No caching**: Repeated queries recomputed

### Future Improvements
1. Replace in-memory vector store with Pinecone/Weaviate
2. Add Redis for caching and session management
3. Implement proper async/await patterns
4. Add database for conversation persistence
5. Deploy with multiple workers (after fixing global state)

---

## Testing Strategy

### Unit Tests
- `tests/test_embeddings.py`: Embedding extraction
- `tests/test_orchestrator.py`: Offline flow

### Integration Tests
- `tests/test_api_integration.py`: End-to-end API tests

### Test Coverage
- Current: ~40% (estimated)
- Target: >80%

### Running Tests
```bash
pytest -v                    # All tests
pytest tests/test_api_integration.py  # Specific file
pytest -k "chat"             # Pattern match
```

---

## Monitoring and Observability

### Current State
⚠️ **No observability** - See [CODEX_REVIEW.md](CODEX_REVIEW.md)

### Needed
- [ ] Structured logging
- [ ] Metrics (Prometheus)
- [ ] Tracing (OpenTelemetry)
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring

---

## Known Issues and Limitations

See [CODEX_REVIEW.md](CODEX_REVIEW.md) for detailed analysis.

**Critical Issues**:
1. Deprecated FastAPI patterns
2. Global mutable state
3. No input validation
4. Security vulnerabilities
5. Hash-based embeddings are useless

**High Priority**:
1. PlannerAgent is not AI-powered
2. Naive chunking algorithm
3. No error handling
4. Primitive memory management

---

## Future Architecture

### Proposed Improvements

1. **Multi-Agent Framework**
   - Replace with CrewAI or AutoGen
   - Proper agent autonomy
   - Tool use capabilities

2. **Vector Database**
   - Pinecone, Weaviate, or ChromaDB
   - Persistent storage
   - Efficient similarity search

3. **Async Architecture**
   - Proper async/await throughout
   - Background task processing
   - Event-driven design

4. **Authentication Layer**
   - JWT tokens
   - User management
   - Role-based access

5. **Observability Stack**
   - Structured logging (structlog)
   - Metrics (Prometheus)
   - Tracing (Jaeger)
   - APM (DataDog/New Relic)

---

**Last Updated**: November 25, 2025  
**Version**: 1.0  
**Status**: Initial architecture documentation

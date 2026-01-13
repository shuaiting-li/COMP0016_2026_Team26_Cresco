# Code Review & Known Issues

This document provides a critical review of the Agritech Assistant codebase, documenting known issues, technical debt, and recommendations for improvement.

## Executive Summary

| Category | Grade | Notes |
|----------|-------|-------|
| Architecture | A- | Clean multi-agent design, good separation of concerns |
| Code Quality | B+ | Type-safe, well-structured, minor improvements needed |
| Test Coverage | C | Sparse coverage (~30%), needs significant improvement |
| Security | D | No auth, no rate limiting, limited input validation |
| Documentation | B+ | Comprehensive but with some broken links (being fixed) |
| **Overall** | **B** | Solid foundation, needs hardening for production |

---

## Critical Issues

### Issue #1: No Authentication or Authorization
**Severity**: Critical  
**Location**: `app/main.py`

**Description**: All endpoints are publicly accessible without any authentication.

**Risk**: Anyone can send messages and ingest documents into the knowledge base.

**Recommendation**: Implement JWT-based authentication or API key validation.

```python
# Suggested implementation
from fastapi.security import HTTPBearer
security = HTTPBearer()

@app.post("/chat")
def chat(
    request: ChatRequest,
    token: str = Depends(security),
    orchestrator: AgritechOrchestrator = Depends(get_orchestrator)
):
    # Validate token before processing
    pass
```

---

### Issue #2: Global Mutable State
**Severity**: High  
**Location**: `app/main.py:32`

**Description**: The orchestrator is stored as a single instance in `app.state`. This means:
- All users share the same conversation memory
- Multi-worker deployment will create inconsistent state
- No session isolation

**Risk**: User conversations may leak between sessions.

**Recommendation**: 
1. Implement session-based orchestrator instances
2. Use Redis for shared state if deploying with multiple workers

---

### Issue #3: Hash-Based Embeddings in Offline Mode
**Severity**: High  
**Location**: `agritech_core/rag.py:68-85` (`LocalEmbeddingClient`)

**Description**: The offline fallback uses SHA256 hash-based "embeddings" which are not semantically meaningful.

**Risk**: RAG retrieval in offline mode returns random results, not semantically relevant content.

**Recommendation**:
- Document this limitation clearly for users
- Consider using a local embedding model (e.g., sentence-transformers) if offline semantic search is needed

---

### Issue #4: No Input Rate Limiting
**Severity**: Medium  
**Location**: `app/main.py`

**Description**: No rate limiting on any endpoint.

**Risk**: API abuse, cost overruns on Gemini API, potential DoS.

**Recommendation**: Add FastAPI rate limiting middleware:
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/chat")
@limiter.limit("10/minute")
def chat(...):
    pass
```

---

### Issue #5: Silent Error Handling
**Severity**: Medium  
**Location**: `agritech_core/agents.py:68-71`

**Description**: When PlannerAgent fails to parse LLM response, it logs a warning and returns an empty list.

```python
except Exception as e:
    logger.warning(f"Failed to generate plan with LLM: {e}")
    return []  # Silent failure
```

**Risk**: Users may not know why tasks are missing from responses.

**Recommendation**: Consider returning a default task or including error information in the response.

---

## High Priority Issues

### Issue #6: O(n) Vector Search
**Severity**: Medium  
**Location**: `agritech_core/rag.py:151-169` (`SimpleVectorStore.similarity_search`)

**Description**: Brute-force cosine similarity search scales linearly with document count.

**Risk**: Performance degrades significantly with large knowledge bases.

**Current Code**:
```python
scores = np.dot(np.vstack(self._vectors), query)
best_indices = np.argsort(scores)[::-1][:top_k]
```

**Recommendation**: Replace with a proper vector database for production:
- ChromaDB (lightweight, easy integration)
- Pinecone (managed, scalable)
- Weaviate (open-source, feature-rich)

---

### Issue #7: Naive Text Chunking
**Severity**: Medium  
**Location**: `agritech_core/rag.py:40-60` (`TextChunker`)

**Description**: Fixed-size character chunking with no sentence awareness.

**Problems**:
- Chunks may split mid-sentence or mid-word
- Markdown formatting is destroyed
- No semantic grouping

**Recommendation**: Implement sentence-aware chunking:
```python
import nltk
sentences = nltk.sent_tokenize(text)
# Group sentences into chunks of appropriate size
```

---

### Issue #8: No Persistent Storage
**Severity**: Medium  
**Location**: `agritech_core/rag.py:133-136` (`SimpleVectorStore`)

**Description**: Vector store is in-memory only. All ingested documents are lost on restart.

**Risk**: Knowledge base must be re-ingested every time the server restarts.

**Recommendation**: Implement persistence:
- Pickle/JSON serialization for development
- Database storage for production

---

## Test Coverage Gaps

### Missing Tests

| Component | Current Tests | Missing Tests |
|-----------|---------------|---------------|
| PlannerAgent | 3 tests | Edge cases, error recovery |
| RAGAgent | 0 tests | All functionality |
| ChatAgent | 0 tests | All functionality |
| TextChunker | 0 tests | Edge cases, overlap handling |
| VectorStore | 0 tests | Similarity search accuracy |
| API Endpoints | 1 test | Error cases, validation |

### Test Recommendations

1. Add `tests/test_api_integration.py` with full endpoint coverage
2. Add `tests/test_rag_pipeline.py` for chunking and retrieval
3. Add error case tests for all agents
4. Implement test fixtures in `conftest.py`

---

## Security Vulnerabilities

### 1. No CORS Configuration
**Location**: `app/main.py`

The API has no CORS configuration, which is a security risk when accessed from browsers.

### 2. No Request Size Limits
**Location**: `app/main.py`

Large payloads could exhaust server memory.

### 3. Potential Prompt Injection
**Location**: `agritech_core/agents.py`

User messages are directly interpolated into LLM prompts without sanitization.

---

## Performance Bottlenecks

1. **Synchronous LLM Calls**: All Gemini API calls are synchronous, blocking the event loop
2. **No Caching**: Repeated queries trigger new LLM/embedding calls
3. **Sequential Embedding**: Documents are embedded one at a time instead of batched

---

## Code Smells

### 1. Magic Numbers
**Location**: Various files

```python
# In memory.py
max_turns: int = 6  # Why 6?

# In config.py
chunk_size: int = 500  # Why 500?
```

**Recommendation**: Add comments explaining rationale for default values.

### 2. Unused Import
**Location**: `agritech_core/agents.py:7`

```python
from typing import Iterable  # Used
```

All imports appear to be used.

---

## Recommendations by Priority

### Immediate (Before Production)
1. Add authentication/authorization
2. Add rate limiting
3. Configure CORS
4. Add request size limits

### Short-term (Next Sprint)
1. Replace in-memory vector store with persistent solution
2. Add comprehensive test suite
3. Implement structured error handling
4. Add request/response logging

### Medium-term (Next Month)
1. Convert to async architecture
2. Add caching layer
3. Implement sentence-aware chunking
4. Add user session management

### Long-term (Future)
1. Consider CrewAI/AutoGen for advanced agent orchestration
2. Implement real-time weather integration
3. Add image processing for crop identification
4. Deploy with auto-scaling

---

## Comparison to Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| FR1: Daily reminders | 🟡 Partial | Planner generates tasks, no scheduling |
| FR2: Natural conversation via LLM | ✅ Complete | Working with Gemini |
| FR3: Image analysis | ❌ Not started | Planned for M2 |
| FR4: RAG with citations | ✅ Complete | Working |
| FR5: Long-term memory | 🟡 Partial | Session memory only, not persistent |
| FR6: Easy setup | ✅ Complete | <10 min with setup.sh |

---

## Final Grade Breakdown

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Functionality | 30% | 80% | 24% |
| Code Quality | 25% | 85% | 21.25% |
| Test Coverage | 20% | 35% | 7% |
| Security | 15% | 25% | 3.75% |
| Documentation | 10% | 85% | 8.5% |
| **Total** | **100%** | | **64.5%** |

**Final Grade: C+ / B-** (Good foundation, needs hardening)

---

**Last Updated**: December 9, 2025  
**Reviewed By**: Code Review Bot  
**Next Review**: Before M1 milestone (Dec 12, 2025)

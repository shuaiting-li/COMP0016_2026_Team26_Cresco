# --- Builder stage ---
FROM python:3.12-slim AS builder

RUN pip install uv

WORKDIR /app/backend

COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --frozen

# --- Runtime stage ---
FROM python:3.12-slim

# Install runtime system dependencies:
# libpq5 for psycopg, libgdal-dev/gdal-bin for rasterio, libgl1-mesa-glx for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libgdal-dev \
    gdal-bin \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Copy virtual environment from builder
COPY --from=builder /app/backend/.venv .venv

# Copy application code
COPY cresco/ cresco/
COPY scripts/ scripts/

# Bake static knowledge base into image
COPY data/knowledge_base/ data/knowledge_base/

# Create empty directories for runtime data
RUN mkdir -p data/chroma_db data/uploads data/ndvi_images

ENV PATH="/app/backend/.venv/bin:$PATH"

EXPOSE 8000

CMD ["gunicorn", "cresco.main:app", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "120"]

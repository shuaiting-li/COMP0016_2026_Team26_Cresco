FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

RUN apt-get update \
    && apt-get install -y --no-install-recommends libexpat1 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

COPY backend/ /app/backend/

RUN uv sync --no-dev

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "cresco.main:app", "--host", "0.0.0.0", "--port", "8000"]
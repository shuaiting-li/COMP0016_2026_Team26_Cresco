"""FastAPI application entry point for Cresco."""

import logging
from contextlib import asynccontextmanager

import psycopg.errors
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from cresco import __version__, db
from cresco.api import router
from cresco.auth import auth_router
from cresco.config import get_settings

load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    settings = get_settings()
    print(f"[*] Starting Cresco v{__version__}")
    print(f"[*] Knowledge base: {settings.knowledge_base}")
    print(f"[*] Using model: {settings.model_provider}/{settings.model_name}")

    # Initialize database pool
    pool = await db.init_pool(settings.database_url)
    app.state.db_pool = pool
    print("[*] Database pool initialized")

    # Initialize PostgresSaver for conversation checkpointing
    # setup() may race when multiple gunicorn workers start simultaneously;
    # a UniqueViolation on the migrations table is harmless — another worker won.
    async with AsyncPostgresSaver.from_conn_string(settings.database_url) as checkpointer:
        try:
            await checkpointer.setup()
        except psycopg.errors.UniqueViolation:
            logger.info("Checkpointer migrations already applied by another worker")
        app.state.checkpointer = checkpointer
        print("[*] PostgresSaver checkpointer initialized")

        yield

    # Shutdown
    await db.close_pool()
    print("[*] Shutting down Cresco")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Cresco",
        description="AI Chatbot for UK Farmers - Agricultural knowledge assistant",
        version=__version__,
        lifespan=lifespan,
    )

    settings = get_settings()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Include API routes
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(router, prefix="/api/v1")

    return app


# Create app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "cresco.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
    )

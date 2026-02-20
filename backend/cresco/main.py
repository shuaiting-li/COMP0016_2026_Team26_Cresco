"""FastAPI application entry point for Cresco."""

from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cresco import __version__
from cresco.api import router
from cresco.config import get_settings

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    settings = get_settings()
    print(f"[*] Starting Cresco v{__version__}")
    print(f"[*] Knowledge base: {settings.knowledge_base}")
    print(f"[*] Using model: {settings.model_provider}/{settings.model_name}")
    yield
    # Shutdown
    print("[*] Shutting down Cresco")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    get_settings()

    app = FastAPI(
        title="Cresco",
        description="AI Chatbot for UK Farmers - Agricultural knowledge assistant",
        version=__version__,
        lifespan=lifespan,
    )

    # Configure CORS for frontend access
    # Note: allow_origins=["*"] with allow_credentials=True is not valid per CORS spec
    # Use specific origins in production
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",  # Vite dev server
            "http://localhost:3000",  # Alternative dev port
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Include API routes
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

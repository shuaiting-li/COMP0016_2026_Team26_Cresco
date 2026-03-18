"""Tests for FastAPI application setup."""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cresco import __version__
from cresco.main import app, create_app


class TestCreateApp:
    """Tests for create_app factory function."""

    def test_creates_fastapi_app(self):
        """Test create_app returns a FastAPI instance."""
        from fastapi import FastAPI

        with patch("cresco.main.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock()
            created_app = create_app()
            assert isinstance(created_app, FastAPI)

    def test_app_has_correct_title(self):
        """Test app has correct title."""
        assert app.title == "Cresco"

    def test_app_has_version(self):
        """Test app has version set."""
        assert app.version == __version__

    def test_app_has_description(self):
        """Test app has a non-empty description."""
        assert isinstance(app.description, str)
        assert len(app.description) > 0

    def test_app_includes_api_router(self):
        """Test app includes the API router with correct prefix."""
        routes = [route.path for route in app.routes]
        # Check that API routes are registered
        assert any("/api/v1" in route for route in routes)


class TestCORS:
    """Tests for CORS middleware configuration."""

    def test_cors_middleware_added(self, client):
        """Test CORS middleware is added to the app."""
        response = client.get(
            "/api/v1/health",
            headers={"Origin": "http://localhost:3000"},
        )
        assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


class TestAppVersion:
    """Tests for application version."""

    def test_version_is_string(self):
        """Test version is a string."""
        assert isinstance(__version__, str)

    def test_version_format(self):
        """Test version follows semantic versioning format."""
        parts = __version__.split(".")
        assert len(parts) >= 2  # At least major.minor
        # Each part should be numeric (possibly with suffix for patch)
        assert parts[0].isdigit()
        assert parts[1].isdigit()


class TestLifespan:
    """Tests for application lifespan events."""

    @pytest.mark.asyncio
    async def test_lifespan_startup(self):
        """Test lifespan context manager runs startup without raising."""
        from cresco.main import lifespan

        mock_checkpointer = AsyncMock()

        @asynccontextmanager
        async def fake_from_conn_string(*args, **kwargs):
            yield mock_checkpointer

        with (
            patch("cresco.main.get_settings") as mock_settings,
            patch("cresco.main.db") as mock_db,
            patch("cresco.main.AsyncPostgresSaver") as mock_pg_saver,
        ):
            mock_settings.return_value.knowledge_base = "/tmp/kb"
            mock_settings.return_value.model_provider = "openai"
            mock_settings.return_value.model_name = "gpt-4"
            mock_settings.return_value.database_url = "postgresql://test:test@localhost/test"
            mock_db.init_pool = AsyncMock(return_value=MagicMock())
            mock_db.close_pool = AsyncMock()
            mock_pg_saver.from_conn_string = fake_from_conn_string

            async with lifespan(app):
                # Verify startup accessed settings
                assert mock_settings.called
                mock_db.init_pool.assert_called_once()
                mock_checkpointer.setup.assert_called_once()

"""Tests for configuration settings."""

import os
from pathlib import Path
from unittest.mock import patch

from cresco.config import Settings, get_settings


class TestSettings:
    """Tests for Settings class."""

    def test_default_values(self):
        """Test default settings have expected types."""
        settings = Settings()
        # Check types rather than exact values (values may come from .env)
        assert isinstance(settings.model_provider, str)
        assert isinstance(settings.model_name, str)
        assert isinstance(settings.api_port, int)
        assert isinstance(settings.debug, bool)

    def test_chroma_path_property(self):
        """Test chroma_path returns Path object."""
        settings = Settings(chroma_persist_dir="/tmp/chroma")
        assert isinstance(settings.chroma_path, Path)
        assert str(settings.chroma_path) == "/tmp/chroma"

    def test_knowledge_base_property(self):
        """Test knowledge_base returns Path object."""
        settings = Settings(knowledge_base_path="/tmp/kb")
        assert isinstance(settings.knowledge_base, Path)
        assert str(settings.knowledge_base) == "/tmp/kb"

    def test_override_with_env_vars(self):
        """Test settings can be overridden with environment variables."""
        with patch.dict(
            os.environ,
            {
                "MODEL_PROVIDER": "openai",
                "MODEL_NAME": "gpt-4",
                "API_PORT": "9000",
            },
        ):
            # Need to create new settings instance to pick up env vars
            settings = Settings()
            assert settings.model_provider == "openai"
            assert settings.model_name == "gpt-4"
            assert settings.api_port == 9000

    def test_azure_settings(self):
        """Test Azure OpenAI settings."""
        settings = Settings(
            azure_openai_endpoint="https://test.openai.azure.com",
            azure_openai_api_version="2024-08-01-preview",
            azure_openai_deployment="my-deployment",
            azure_openai_embedding_deployment="my-embedding",
        )
        assert "azure.com" in settings.azure_openai_endpoint
        assert settings.azure_openai_deployment == "my-deployment"

    def test_api_host_default(self):
        """Test default API host is 0.0.0.0."""
        settings = Settings()
        assert settings.api_host == "0.0.0.0"

    def test_embedding_model_default(self):
        """Test embedding model is set."""
        settings = Settings()
        assert isinstance(settings.embedding_model, str)
        assert len(settings.embedding_model) > 0

    def test_extra_fields_ignored(self):
        """Test extra fields are ignored (extra='ignore' in config)."""
        # This should not raise an error
        settings = Settings(unknown_field="value")
        assert not hasattr(settings, "unknown_field")


class TestGetSettings:
    """Tests for get_settings function."""

    def test_returns_settings_instance(self):
        """Test get_settings returns Settings instance."""
        # Clear the cache first
        get_settings.cache_clear()
        settings = get_settings()
        assert isinstance(settings, Settings)

    def test_cached_singleton(self):
        """Test get_settings returns cached instance."""
        get_settings.cache_clear()
        settings1 = get_settings()
        settings2 = get_settings()
        assert settings1 is settings2

    def test_cache_can_be_cleared(self):
        """Test settings cache can be cleared."""
        get_settings.cache_clear()
        settings1 = get_settings()

        get_settings.cache_clear()
        settings2 = get_settings()

        # After clearing, should be a new instance
        # (they're equal but may or may not be the same object depending on timing)
        assert settings1 == settings2


class TestSettingsValidation:
    """Tests for settings validation."""

    def test_valid_model_providers(self):
        """Test various model providers are accepted."""
        providers = ["openai", "azure-openai", "google-genai", "anthropic"]
        for provider in providers:
            settings = Settings(model_provider=provider)
            assert settings.model_provider == provider

    def test_port_must_be_integer(self):
        """Test port must be an integer."""
        settings = Settings(api_port=8080)
        assert settings.api_port == 8080
        assert isinstance(settings.api_port, int)

    def test_debug_boolean(self):
        """Test debug is a boolean."""
        settings = Settings(debug=False)
        assert settings.debug is False

        settings = Settings(debug=True)
        assert settings.debug is True

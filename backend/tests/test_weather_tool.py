"""Tests for the weather tool (inline closure in agent.py)."""

from unittest.mock import MagicMock, patch

import pytest

from cresco.agent.agent import CrescoAgent


SAMPLE_WEATHER = {
    "weather": [{"description": "light rain"}],
    "main": {"temp": 12.5, "feels_like": 10.0, "humidity": 78},
    "wind": {"speed": 4.2},
}
SAMPLE_FORECAST = {
    "list": [
        {
            "dt_txt": "2026-02-25 12:00:00",
            "weather": [{"description": "cloudy"}],
            "main": {"temp": 11.0},
            "wind": {"speed": 3.5},
            "rain": {"3h": 0.5},
        },
        {
            "dt_txt": "2026-02-26 12:00:00",
            "weather": [{"description": "sunny"}],
            "main": {"temp": 14.0},
            "wind": {"speed": 2.1},
        },
    ],
}


@pytest.fixture
def weather_tool(mock_settings):
    """Build a CrescoAgent and extract the get_weather_data tool closure."""
    mock_settings.model_provider = "azure-openai"
    with (
        patch("cresco.agent.agent.get_vector_store") as mock_vs,
        patch("cresco.agent.agent.create_agent") as mock_create,
        patch("langchain_openai.AzureChatOpenAI"),
        patch("cresco.agent.agent.TavilySearch"),
    ):
        mock_vs.return_value = MagicMock()
        mock_create.return_value = MagicMock()

        CrescoAgent(mock_settings)

        # Extract get_weather_data tool from create_agent call args
        call_kwargs = mock_create.call_args
        tools = call_kwargs.kwargs.get("tools", [])
        for t in tools:
            if hasattr(t, "name") and t.name == "get_weather_data":
                return t
        raise ValueError("get_weather_data tool not found in create_agent call")


class TestGetWeatherDataTool:
    """Tests for the get_weather_data agent tool."""

    def _make_farm_data(self, *, with_weather=True):
        """Build a sample farm_data dict for a test user."""
        data = {
            "user-123": {
                "location": "Cambridge, UK",
                "area": 1.5,
            }
        }
        if with_weather:
            data["user-123"]["weather"] = {
                "location": "Cambridge",
                "current_weather": SAMPLE_WEATHER,
                "forecast": SAMPLE_FORECAST,
            }
        return data

    def test_returns_weather_when_available(self, weather_tool):
        """Test tool returns formatted weather when farm + weather data exist."""
        farm = self._make_farm_data()
        with patch("cresco.api.routes.farm_data", farm):
            result = weather_tool.invoke({"user_id": "user-123"})

        assert "Cambridge" in result
        assert "light rain" in result
        assert "12.5" in result
        assert "cloudy" in result
        assert "area" in result.lower()

    def test_returns_instruction_when_no_farm_data(self, weather_tool):
        """Test tool instructs user to set up farm when no data exists."""
        with patch("cresco.api.routes.farm_data", {}):
            result = weather_tool.invoke({"user_id": "user-123"})

        assert "satellite map" in result.lower()
        assert "farm" in result.lower()

    def test_returns_instruction_when_no_weather_data(self, weather_tool):
        """Test tool instructs user when weather is missing from farm data."""
        farm = self._make_farm_data(with_weather=False)
        with patch("cresco.api.routes.farm_data", farm):
            result = weather_tool.invoke({"user_id": "user-123"})

        assert "weather" in result.lower()

    def test_unknown_user_id(self, weather_tool):
        """Test tool handles unknown user_id gracefully."""
        farm = self._make_farm_data()
        with patch("cresco.api.routes.farm_data", farm):
            result = weather_tool.invoke({"user_id": "unknown-user"})

        assert "no farm data" in result.lower()

    def test_forecast_includes_rain(self, weather_tool):
        """Test forecast entry with rain data is formatted."""
        farm = self._make_farm_data()
        with patch("cresco.api.routes.farm_data", farm):
            result = weather_tool.invoke({"user_id": "user-123"})

        assert "rain" in result.lower()

    def test_forecast_missing_rain_defaults_to_zero(self, weather_tool):
        """Test forecast entry without rain data defaults to 0."""
        farm = self._make_farm_data()
        with patch("cresco.api.routes.farm_data", farm):
            result = weather_tool.invoke({"user_id": "user-123"})

        # The 2026-02-26 entry has no rain key → should show 0
        assert "rain 0 mm" in result

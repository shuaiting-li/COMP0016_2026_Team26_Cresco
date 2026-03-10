"""Tests for the get_farm_location tool (inline closure in agent.py)."""

from unittest.mock import MagicMock, patch

import pytest

from cresco.agent.agent import CrescoAgent


@pytest.fixture
def farm_location_tool(mock_settings):
    """Build a CrescoAgent and extract the get_farm_location tool closure."""
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

        # Extract get_farm_location tool from create_agent call args
        call_kwargs = mock_create.call_args
        tools = call_kwargs.kwargs.get("tools", [])
        for t in tools:
            if hasattr(t, "name") and t.name == "get_farm_location":
                return t
        raise ValueError("get_farm_location tool not found in create_agent call")


class TestGetFarmLocationTool:
    """Tests for the get_farm_location agent tool."""

    def test_returns_location_when_available(self, farm_location_tool):
        """Test tool returns formatted location when farm data exists."""
        user_data = {
            "location": "Cambridge, UK",
            "area": 1.5,
            "lat": 52.2053,
            "lon": 0.1218,
        }
        with (
            patch("cresco.db.get_farm_data", return_value=user_data),
            patch("cresco.config.get_settings"),
        ):
            result = farm_location_tool.invoke({}, {"configurable": {"user_id": "user-123"}})

        assert "Cambridge, UK" in result
        assert "52.2053" in result
        assert "0.1218" in result
        assert "1.5" in result
        assert "km²" in result

    def test_returns_instruction_when_no_farm_data(self, farm_location_tool):
        """Test tool instructs user to set up farm when no data exists."""
        with (
            patch("cresco.db.get_farm_data", return_value=None),
            patch("cresco.config.get_settings"),
        ):
            result = farm_location_tool.invoke({}, {"configurable": {"user_id": "user-123"}})

        assert "satellite map" in result.lower()
        assert "no farm location" in result.lower()

    def test_handles_empty_farm_data(self, farm_location_tool):
        """Test tool handles empty farm data dict gracefully."""
        with (
            patch("cresco.db.get_farm_data", return_value={}),
            patch("cresco.config.get_settings"),
        ):
            result = farm_location_tool.invoke({}, {"configurable": {"user_id": "user-123"}})

        assert "no farm location" in result.lower()

    def test_unknown_user_id(self, farm_location_tool):
        """Test tool handles unknown user_id gracefully."""
        with (
            patch("cresco.db.get_farm_data", return_value=None),
            patch("cresco.config.get_settings"),
        ):
            result = farm_location_tool.invoke({}, {"configurable": {"user_id": "unknown-user"}})

        assert "no farm location" in result.lower()

    def test_returns_partial_data_location_only(self, farm_location_tool):
        """Test tool returns available info when only location name is set."""
        user_data = {"location": "Oxford, UK"}
        with (
            patch("cresco.db.get_farm_data", return_value=user_data),
            patch("cresco.config.get_settings"),
        ):
            result = farm_location_tool.invoke({}, {"configurable": {"user_id": "user-123"}})

        assert "Oxford, UK" in result
        assert "Coordinates" not in result
        assert "area" not in result.lower()

    def test_returns_partial_data_coords_only(self, farm_location_tool):
        """Test tool returns coordinates when only lat/lon are set."""
        user_data = {"lat": 51.75, "lon": -1.25}
        with (
            patch("cresco.db.get_farm_data", return_value=user_data),
            patch("cresco.config.get_settings"),
        ):
            result = farm_location_tool.invoke({}, {"configurable": {"user_id": "user-123"}})

        assert "51.75" in result
        assert "-1.25" in result

    def test_handles_data_without_location_details(self, farm_location_tool):
        """Test tool handles farm data that has no location, coords, or area."""
        user_data = {"weather": {"location": "Somewhere"}}
        with (
            patch("cresco.db.get_farm_data", return_value=user_data),
            patch("cresco.config.get_settings"),
        ):
            result = farm_location_tool.invoke({}, {"configurable": {"user_id": "user-123"}})

        assert "no location details" in result.lower()

"""Tests for agent prompts."""

from cresco.agent.prompts import INTERNET_SEARCH_DISABLED_ADDENDUM, SYSTEM_PROMPT


class TestSystemPrompt:
    """Tests for the system prompt."""

    def test_prompt_is_string(self):
        """Test system prompt is a non-empty string."""
        assert isinstance(SYSTEM_PROMPT, str)
        assert len(SYSTEM_PROMPT) > 0

    def test_prompt_identifies_as_cresco(self):
        """Test prompt identifies the agent as Cresco."""
        assert "Cresco" in SYSTEM_PROMPT

    def test_prompt_mentions_uk_farmers(self):
        """Test prompt mentions UK farmers."""
        assert "UK" in SYSTEM_PROMPT
        assert "farmer" in SYSTEM_PROMPT.lower()

    def test_prompt_mentions_retrieval_tool(self):
        """Test prompt mentions the retrieval tool."""
        assert "retrieve_agricultural_info" in SYSTEM_PROMPT

    def test_prompt_mentions_weather_tool(self):
        """Test prompt mentions the weather tool."""
        assert "get_weather_data" in SYSTEM_PROMPT

    def test_prompt_mentions_search_tool(self):
        """Test prompt mentions the internet search tool."""
        assert "tavily_search" in SYSTEM_PROMPT

    def test_prompt_includes_expertise_areas(self):
        """Test prompt includes key expertise areas."""
        expertise = [
            "disease",
            "nutrient",
            "wheat",
            "barley",
            "oat",
            "maize",
            "seed",
        ]
        for topic in expertise:
            assert topic.lower() in SYSTEM_PROMPT.lower(), f"Missing expertise: {topic}"

    def test_prompt_includes_task_format(self):
        """Test prompt includes task format instructions."""
        assert "---TASKS---" in SYSTEM_PROMPT
        assert "---END_TASKS---" in SYSTEM_PROMPT

    def test_prompt_limits_tasks_to_five(self):
        """Test prompt instructs the LLM to suggest no more than five tasks."""
        assert "5 or fewer" in SYSTEM_PROMPT

    def test_prompt_mentions_metric_units(self):
        """Test prompt mentions UK metric units."""
        assert "kg/ha" in SYSTEM_PROMPT or "metric" in SYSTEM_PROMPT.lower()

    def test_prompt_mentions_ipm(self):
        """Test prompt mentions Integrated Pest Management."""
        assert "IPM" in SYSTEM_PROMPT or "Integrated Pest Management" in SYSTEM_PROMPT

    def test_prompt_includes_guidelines(self):
        """Test prompt includes guidelines section."""
        assert "guideline" in SYSTEM_PROMPT.lower()

    def test_prompt_reasonable_length(self):
        """Test prompt is a reasonable length (not too short or too long)."""
        # Should be comprehensive but not excessive
        assert len(SYSTEM_PROMPT) > 500  # Not too short
        assert len(SYSTEM_PROMPT) < 10000  # Not too long


class TestInternetSearchDisabledAddendum:
    """Tests for the internet search disabled addendum."""

    def test_addendum_is_string(self):
        """Test addendum is a non-empty string."""
        assert isinstance(INTERNET_SEARCH_DISABLED_ADDENDUM, str)
        assert len(INTERNET_SEARCH_DISABLED_ADDENDUM) > 0

    def test_addendum_mentions_disabled(self):
        """Test addendum tells the agent that internet search is disabled."""
        assert "disabled" in INTERNET_SEARCH_DISABLED_ADDENDUM.lower()

    def test_addendum_mentions_toggle(self):
        """Test addendum tells the agent about the globe icon toggle."""
        assert "globe" in INTERNET_SEARCH_DISABLED_ADDENDUM.lower()

    def test_addendum_mentions_re_enable(self):
        """Test addendum instructs the agent to tell users how to re-enable search."""
        assert "re-enable" in INTERNET_SEARCH_DISABLED_ADDENDUM.lower()

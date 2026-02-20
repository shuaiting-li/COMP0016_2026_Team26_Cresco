"""Tests for agent prompts."""

from cresco.agent.prompts import SYSTEM_PROMPT


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

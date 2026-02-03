"""Tests for CrescoAgent."""

import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock

from cresco.agent.agent import CrescoAgent, get_agent


# Helper context manager for mocking agent dependencies
def mock_agent_deps(mock_settings):
    """Context manager to mock all agent dependencies."""
    mock_settings.model_provider = "azure-openai"
    patches = [
        patch("cresco.agent.agent.get_vector_store"),
        patch("cresco.agent.agent.create_agent"),
        patch("langchain_openai.AzureChatOpenAI"),  # Patch at source
    ]
    return patches


class TestCrescoAgentInit:
    """Tests for CrescoAgent initialization."""

    def test_agent_initialization(self, mock_settings):
        """Test agent initializes correctly."""
        mock_settings.model_provider = "azure-openai"
        with patch("cresco.agent.agent.get_vector_store") as mock_vs:
            with patch("cresco.agent.agent.create_agent") as mock_create:
                with patch("langchain_openai.AzureChatOpenAI") as mock_azure:
                    mock_vs.return_value = MagicMock()
                    mock_create.return_value = MagicMock()
                    mock_azure.return_value = MagicMock()

                    agent = CrescoAgent(mock_settings)

                    assert agent.settings == mock_settings
                    assert mock_vs.called
                    assert mock_create.called

    def test_uses_azure_openai_for_azure_provider(self, mock_settings):
        """Test uses AzureChatOpenAI when provider is azure-openai."""
        mock_settings.model_provider = "azure-openai"
        mock_settings.azure_openai_deployment = "test-deployment"
        mock_settings.azure_openai_endpoint = "https://test.azure.com"

        with patch("cresco.agent.agent.get_vector_store") as mock_vs:
            with patch("cresco.agent.agent.create_agent") as mock_create:
                with patch("langchain_openai.AzureChatOpenAI") as mock_azure:
                    mock_vs.return_value = MagicMock()
                    mock_create.return_value = MagicMock()
                    mock_azure.return_value = MagicMock()

                    agent = CrescoAgent(mock_settings)

                    assert mock_azure.called

    def test_uses_init_chat_model_for_other_providers(self, mock_settings):
        """Test uses init_chat_model for non-Azure providers."""
        mock_settings.model_provider = "openai"
        mock_settings.model_name = "gpt-4o"

        with patch("cresco.agent.agent.get_vector_store") as mock_vs:
            with patch("cresco.agent.agent.create_agent") as mock_create:
                with patch("cresco.agent.agent.init_chat_model") as mock_init:
                    mock_vs.return_value = MagicMock()
                    mock_create.return_value = MagicMock()

                    agent = CrescoAgent(mock_settings)

                    mock_init.assert_called_once()
                    call_kwargs = mock_init.call_args
                    assert call_kwargs[0][0] == "gpt-4o"


class TestCrescoAgentChat:
    """Tests for CrescoAgent.chat method."""

    @pytest.mark.asyncio
    async def test_chat_returns_answer(self, mock_settings):
        """Test chat returns an answer."""
        mock_settings.model_provider = "azure-openai"
        with patch("cresco.agent.agent.get_vector_store") as mock_vs:
            with patch("cresco.agent.agent.create_agent") as mock_create:
                with patch("langchain_openai.AzureChatOpenAI") as mock_azure:
                    mock_vs.return_value = MagicMock()
                    mock_azure.return_value = MagicMock()

                    # Create mock agent that returns a response
                    mock_agent = AsyncMock()
                    mock_message = MagicMock()
                    mock_message.content = "This is the response"
                    mock_message.artifact = None
                    mock_agent.ainvoke.return_value = {"messages": [mock_message]}
                    mock_create.return_value = mock_agent

                    agent = CrescoAgent(mock_settings)
                    result = await agent.chat("What is wheat?")

                    assert "answer" in result
                    assert result["answer"] == "This is the response"

    @pytest.mark.asyncio
    async def test_chat_returns_sources(self, mock_settings):
        """Test chat returns sources from tool artifacts."""
        mock_settings.model_provider = "azure-openai"
        with patch("cresco.agent.agent.get_vector_store") as mock_vs:
            with patch("cresco.agent.agent.create_agent") as mock_create:
                with patch("langchain_openai.AzureChatOpenAI") as mock_azure:
                    mock_vs.return_value = MagicMock()
                    mock_azure.return_value = MagicMock()

                    # Create mock with artifact
                    mock_tool_msg = MagicMock()
                    mock_tool_msg.artifact = [
                        MagicMock(metadata={"filename": "wheat_guide.md"}),
                        MagicMock(metadata={"filename": "disease_guide.md"}),
                    ]
                    mock_tool_msg.content = ""

                    mock_final_msg = MagicMock()
                    mock_final_msg.content = "Here is the answer"
                    mock_final_msg.artifact = None

                    mock_agent = AsyncMock()
                    mock_agent.ainvoke.return_value = {
                        "messages": [mock_tool_msg, mock_final_msg]
                    }
                    mock_create.return_value = mock_agent

                    agent = CrescoAgent(mock_settings)
                    result = await agent.chat("Tell me about diseases")

                    assert "sources" in result
                    assert "wheat_guide.md" in result["sources"]
                    assert "disease_guide.md" in result["sources"]

    @pytest.mark.asyncio
    async def test_chat_parses_tasks(self, mock_settings):
        """Test chat parses tasks from response."""
        mock_settings.model_provider = "azure-openai"
        with patch("cresco.agent.agent.get_vector_store") as mock_vs:
            with patch("cresco.agent.agent.create_agent") as mock_create:
                with patch("langchain_openai.AzureChatOpenAI") as mock_azure:
                    mock_vs.return_value = MagicMock()
                    mock_azure.return_value = MagicMock()

                    tasks_json = json.dumps(
                        [
                            {
                                "title": "Soil Test",
                                "detail": "Test soil pH",
                                "priority": "high",
                            }
                        ]
                    )
                    response_with_tasks = f"Here is your answer.\n\n---TASKS---\n{tasks_json}\n---END_TASKS---"

                    mock_message = MagicMock()
                    mock_message.content = response_with_tasks
                    mock_message.artifact = None

                    mock_agent = AsyncMock()
                    mock_agent.ainvoke.return_value = {"messages": [mock_message]}
                    mock_create.return_value = mock_agent

                    agent = CrescoAgent(mock_settings)
                    result = await agent.chat("What should I do?")

                    assert "tasks" in result
                    assert len(result["tasks"]) == 1
                    assert result["tasks"][0]["title"] == "Soil Test"
                    # Task section should be removed from answer
                    assert "---TASKS---" not in result["answer"]

    @pytest.mark.asyncio
    async def test_chat_handles_content_blocks(self, mock_settings):
        """Test chat handles list of content blocks."""
        mock_settings.model_provider = "azure-openai"
        with patch("cresco.agent.agent.get_vector_store") as mock_vs:
            with patch("cresco.agent.agent.create_agent") as mock_create:
                with patch("langchain_openai.AzureChatOpenAI") as mock_azure:
                    mock_vs.return_value = MagicMock()
                    mock_azure.return_value = MagicMock()

                    mock_message = MagicMock()
                    mock_message.content = [
                        {"type": "text", "text": "Part 1. "},
                        {"type": "text", "text": "Part 2."},
                    ]
                    mock_message.artifact = None

                    mock_agent = AsyncMock()
                    mock_agent.ainvoke.return_value = {"messages": [mock_message]}
                    mock_create.return_value = mock_agent

                    agent = CrescoAgent(mock_settings)
                    result = await agent.chat("Question")

                    assert result["answer"] == "Part 1. Part 2."

    @pytest.mark.asyncio
    async def test_chat_with_thread_id(self, mock_settings):
        """Test chat uses thread_id for conversation memory."""
        mock_settings.model_provider = "azure-openai"
        with patch("cresco.agent.agent.get_vector_store") as mock_vs:
            with patch("cresco.agent.agent.create_agent") as mock_create:
                with patch("langchain_openai.AzureChatOpenAI") as mock_azure:
                    mock_vs.return_value = MagicMock()
                    mock_azure.return_value = MagicMock()

                    mock_message = MagicMock()
                    mock_message.content = "Response"
                    mock_message.artifact = None

                    mock_agent = AsyncMock()
                    mock_agent.ainvoke.return_value = {"messages": [mock_message]}
                    mock_create.return_value = mock_agent

                    agent = CrescoAgent(mock_settings)
                    await agent.chat("Question", thread_id="conversation-123")

                    # Verify ainvoke was called with correct config
                    mock_agent.ainvoke.assert_called_once()
                    call_args = mock_agent.ainvoke.call_args
                    # Config is passed as second positional arg or keyword arg
                    if len(call_args.args) > 1:
                        config = call_args.args[1]
                    else:
                        config = call_args.kwargs.get("config", call_args[1])
                    assert config["configurable"]["thread_id"] == "conversation-123"


class TestCrescoAgentClearMemory:
    """Tests for CrescoAgent.clear_memory method."""

    def test_clear_memory_reinitializes(self, mock_settings):
        """Test clear_memory reinitializes the agent."""
        mock_settings.model_provider = "azure-openai"
        with patch("cresco.agent.agent.get_vector_store") as mock_vs:
            with patch("cresco.agent.agent.create_agent") as mock_create:
                with patch("langchain_openai.AzureChatOpenAI") as mock_azure:
                    mock_vs.return_value = MagicMock()
                    mock_create.return_value = MagicMock()
                    mock_azure.return_value = MagicMock()

                    agent = CrescoAgent(mock_settings)
                    original_checkpointer = agent.checkpointer

                    agent.clear_memory()

                    # Should have a new checkpointer
                    assert agent.checkpointer is not original_checkpointer


class TestGetAgent:
    """Tests for get_agent dependency."""

    def test_get_agent_returns_agent(self):
        """Test get_agent returns a CrescoAgent."""
        with patch("cresco.agent.agent.CrescoAgent") as mock_agent_class:
            with patch("cresco.agent.agent.get_settings") as mock_settings:
                mock_agent_class.return_value = MagicMock()

                # Reset the singleton
                import cresco.agent.agent as agent_module

                agent_module._agent = None

                agent = get_agent()

                assert mock_agent_class.called

"""LangChain agent for Cresco chatbot - Modern 2026 style."""

from langchain.agents import create_agent
from langchain.chat_models import init_chat_model
from langchain.tools import tool
from langchain_core.runnables import RunnableConfig
from langchain_tavily import TavilySearch
from langgraph.checkpoint.memory import InMemorySaver

from cresco.config import Settings, get_settings
from cresco.rag.retriever import get_vector_store

from .prompts import SYSTEM_PROMPT


class CrescoAgent:
    """Conversational agent for agricultural queries using modern LangChain patterns."""

    def __init__(self, settings: Settings):
        """Initialize the Cresco agent."""
        self.settings = settings
        self.vector_store = get_vector_store()
        self.checkpointer = InMemorySaver()
        self._agent = self._build_agent()

    def _build_agent(self):
        """Build the agent using create_agent with retrieval tool."""
        # Initialize the chat model based on provider
        if self.settings.model_provider == "azure-openai":
            # Azure OpenAI requires specific configuration
            # Note: Some Azure models (like o3-mini) only support default temperature
            from langchain_openai import AzureChatOpenAI

            model = AzureChatOpenAI(
                azure_deployment=self.settings.azure_openai_deployment,
                azure_endpoint=self.settings.azure_openai_endpoint,
                api_version=self.settings.azure_openai_api_version,
            )
        else:
            # Other providers (openai, google-genai, anthropic, etc.)
            model = init_chat_model(
                self.settings.model_name,
                model_provider=self.settings.model_provider,
                temperature=0.3,
            )

        # Create retrieval tool with access to vector store
        vector_store = self.vector_store

        @tool(response_format="content_and_artifact")
        def retrieve_agricultural_info(query: str):
            """Search the agricultural knowledge base for relevant information.

            Use this tool to find information about:
            - Crop diseases and pest management
            - Nutrient management and fertilizer recommendations
            - Wheat, barley, oats, and maize cultivation
            - Seed selection and certification standards
            - UK agricultural regulations and best practices
            """
            retrieved_docs = vector_store.similarity_search(query, k=5)
            serialized = "\n\n".join(
                f"Source: {doc.metadata.get('filename', 'Unknown')}\n"
                f"Category: {doc.metadata.get('category', 'general')}\n"
                f"Content: {doc.page_content}"
                for doc in retrieved_docs
            )
            return serialized, retrieved_docs

        # Internet search tool for real-time information
        internet_search = TavilySearch(
            max_results=5,
            topic="general",
        )

        # Create agent with retrieval and search tools, plus checkpointer for memory
        agent = create_agent(
            model=model,
            tools=[retrieve_agricultural_info, internet_search],
            system_prompt=SYSTEM_PROMPT,
            checkpointer=self.checkpointer,
        )

        return agent

    async def chat(self, message: str, thread_id: str = "default") -> dict:
        """Process a chat message and return response with sources.

        Args:
            message: User's question
            thread_id: Conversation thread ID for memory persistence

        Returns:
            Dict with 'answer', 'sources', and 'tasks' keys
        """
        config: RunnableConfig = {"configurable": {"thread_id": thread_id}}

        result = await self._agent.ainvoke(
            {"messages": [{"role": "user", "content": message}]},
            config,
        )

        # Extract the final AI message
        ai_message = result["messages"][-1]

        # Handle different content formats (string or list of content blocks)
        content = ai_message.content if hasattr(ai_message, "content") else str(ai_message)
        if isinstance(content, list):
            # Extract text from content blocks like [{'type': 'text', 'text': '...'}]
            answer = "".join(
                block.get("text", "") if isinstance(block, dict) else str(block)
                for block in content
            )
        else:
            answer = str(content)

        # Parse tasks from the response if present
        tasks = []
        if "---TASKS---" in answer and "---END_TASKS---" in answer:
            try:
                import json

                task_start = answer.index("---TASKS---") + len("---TASKS---")
                task_end = answer.index("---END_TASKS---")
                task_json = answer[task_start:task_end].strip()
                tasks = json.loads(task_json)[:5]
                # Remove the task section from the answer
                answer = answer[: answer.index("---TASKS---")].strip()
            except (ValueError, json.JSONDecodeError):
                # If parsing fails, just leave tasks empty
                pass

        # Extract sources from tool artifacts if available
        sources = []
        for i in range(
            len(result["messages"]) - 1, len(result["messages"]) - 3, -1
        ):  # Check the last 2 messages for artifacts
            # (tool message is usually the second last message)
            msg = result["messages"][i]
            if hasattr(msg, "artifact") and msg.artifact:
                for doc in msg.artifact:
                    # Support both Document objects and dicts
                    # TODO: short term fix, might be a deeper issue to resolve?
                    # probably just from json conversion during upload
                    metadata = getattr(doc, "metadata", None)
                    if metadata is None and isinstance(doc, dict):
                        metadata = doc.get("metadata", {})
                    if metadata:
                        source = metadata.get("filename", "Unknown")
                        if source not in sources:
                            sources.append(source)
                break  # Only consider the first message with artifacts for sources

        return {
            "answer": answer,
            "sources": sources,
            "tasks": tasks,
        }

    def clear_memory(self, thread_id: str = "default") -> None:
        """Clear conversation memory for a specific thread."""
        # InMemorySaver doesn't have a direct clear method per thread
        # Reinitialize checkpointer to clear all memory
        self.checkpointer = InMemorySaver()
        self._agent = self._build_agent()


# Module-level singleton
_agent = None


def get_agent() -> CrescoAgent:
    """Get or create the Cresco agent instance (singleton)."""
    global _agent
    if _agent is None:
        settings = get_settings()
        _agent = CrescoAgent(settings)
    return _agent

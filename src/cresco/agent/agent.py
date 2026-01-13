"""LangChain agent for Cresco chatbot - Modern 2026 style."""

from langchain.agents import create_agent
from langchain.chat_models import init_chat_model
from langchain.tools import tool
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.runnables import RunnableConfig

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
        # Initialize the chat model
        # API key is automatically picked up from env var (OPENAI_API_KEY, GOOGLE_API_KEY, etc.)
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

        # Create agent with retrieval tool and checkpointer for memory
        agent = create_agent(
            model=model,
            tools=[retrieve_agricultural_info],
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
            Dict with 'answer' and 'sources' keys
        """
        config: RunnableConfig = {"configurable": {"thread_id": thread_id}}

        result = await self._agent.ainvoke(
            {"messages": [{"role": "user", "content": message}]},
            config,
        )

        # Extract the final AI message
        ai_message = result["messages"][-1]
        answer = (
            ai_message.content if hasattr(ai_message, "content") else str(ai_message)
        )

        # Extract sources from tool artifacts if available
        sources = []
        for msg in result["messages"]:
            if hasattr(msg, "artifact") and msg.artifact:
                for doc in msg.artifact:
                    source = doc.metadata.get("filename", "Unknown")
                    if source not in sources:
                        sources.append(source)

        return {
            "answer": answer,
            "sources": sources,
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

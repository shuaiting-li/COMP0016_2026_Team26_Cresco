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

        # Weather tool — reads from the in-memory farm_data store.
        @tool
        def get_weather_data(user_id: str) -> str:
            """Retrieve the current weather and 5-day forecast for the user's farm.

            This data is automatically available once the user has selected
            their farm location on the satellite map.  Call this tool whenever
            the conversation involves weather, planting timing, spraying
            windows, frost risk, harvest scheduling, or any weather-dependent
            farming decision.

            Args:
                user_id: The authenticated user's ID (provided in the conversation).
            """
            from cresco.api.routes import farm_data

            user_data = farm_data.get(user_id, {})

            if not user_data:
                return (
                    "No farm data is available yet. Please ask the user to "
                    "open the satellite map (via the sidebar) and select their "
                    "farm location so that weather and location data can be loaded."
                )

            weather_block = user_data.get("weather")
            if not weather_block:
                return (
                    "The user has set their farm location, but weather data "
                    "could not be loaded. Please ask the user to check their "
                    "internet connection or try reopening the weather panel "
                    "in the sidebar."
                )

            location = weather_block.get("location", "Unknown")
            current = weather_block.get("current_weather", {})
            forecast = weather_block.get("forecast", {})

            # Format current conditions
            main = current.get("main", {})
            wind = current.get("wind", {})
            desc = (
                current["weather"][0]["description"]
                if current.get("weather")
                else "N/A"
            )
            parts = [
                f"Weather for {location}:",
                f"  Condition: {desc}",
                f"  Temperature: {main.get('temp', '?')}°C "
                f"(feels like {main.get('feels_like', '?')}°C)",
                f"  Humidity: {main.get('humidity', '?')}%",
                f"  Wind: {wind.get('speed', '?')} m/s",
                "",
                "5-day forecast (daily summary):",
            ]

            # Collapse 3-hour slots into daily midday summaries
            seen: dict[str, dict] = {}
            for entry in forecast.get("list", []):
                dt_txt = entry.get("dt_txt", "")
                date = dt_txt.split(" ")[0]
                hour = dt_txt.split(" ")[1] if " " in dt_txt else ""
                if date not in seen or hour == "12:00:00":
                    seen[date] = entry

            for date, entry in list(seen.items())[:5]:
                e_main = entry.get("main", {})
                e_desc = (
                    entry["weather"][0]["description"]
                    if entry.get("weather")
                    else "N/A"
                )
                e_wind = entry.get("wind", {})
                rain_mm = entry.get("rain", {}).get("3h", 0)
                parts.append(
                    f"  {date}: {e_desc}, {e_main.get('temp', '?')}°C, "
                    f"wind {e_wind.get('speed', '?')} m/s, rain {rain_mm} mm"
                )

            # Include farm location & area
            if "location" in user_data and "area" in user_data:
                parts.append("")
                parts.append(
                    f"Farm location: {user_data['location']}, "
                    f"area: {user_data['area']} km²"
                )

            return "\n".join(parts)

        # Internet search tool for real-time information
        internet_search = TavilySearch(
            max_results=5,
            topic="general",
        )

        # Create agent with retrieval, weather, and search tools
        agent = create_agent(
            model=model,
            tools=[retrieve_agricultural_info, get_weather_data, internet_search],
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
                tasks = json.loads(task_json)
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

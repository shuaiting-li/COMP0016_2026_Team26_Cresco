"""LangChain agent for Cresco chatbot."""

from functools import lru_cache

from langchain_openai import ChatOpenAI
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.prompts import (
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
from langchain_core.prompts import ChatPromptTemplate

from cresco.config import Settings, get_settings
from cresco.rag.retriever import get_retriever
from .prompts import SYSTEM_PROMPT, QA_PROMPT


class CrescoAgent:
    """Conversational agent for agricultural queries."""

    def __init__(self, settings: Settings):
        """Initialize the Cresco agent."""
        self.settings = settings
        self.llm = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=0.3,
        )
        self.retriever = get_retriever(settings)
        self.memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer",
            k=5,  # Keep last 5 exchanges
        )
        self._chain = self._build_chain()

    def _build_chain(self) -> ConversationalRetrievalChain:
        """Build the conversational retrieval chain."""
        # Create prompt with system context
        messages = [
            SystemMessagePromptTemplate.from_template(SYSTEM_PROMPT),
            HumanMessagePromptTemplate.from_template(QA_PROMPT),
        ]
        qa_prompt = ChatPromptTemplate.from_messages(messages)

        chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.retriever,
            memory=self.memory,
            return_source_documents=True,
            combine_docs_chain_kwargs={"prompt": qa_prompt},
            verbose=self.settings.debug,
        )
        return chain

    async def chat(self, message: str) -> dict:
        """Process a chat message and return response with sources."""
        result = await self._chain.ainvoke({"question": message})

        # Extract source document names
        sources = []
        if "source_documents" in result:
            for doc in result["source_documents"]:
                source = doc.metadata.get("source", "Unknown")
                if source not in sources:
                    sources.append(source)

        return {
            "answer": result["answer"],
            "sources": sources,
        }

    def clear_memory(self) -> None:
        """Clear conversation memory."""
        self.memory.clear()


@lru_cache
def get_agent(settings: Settings = None) -> CrescoAgent:
    """Get or create the Cresco agent instance."""
    if settings is None:
        settings = get_settings()
    return CrescoAgent(settings)

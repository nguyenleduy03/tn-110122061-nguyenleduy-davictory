"""LangChain-based agent using create_agent (LangGraph)."""

import asyncio

from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, AIMessage
from langchain_groq import ChatGroq
from loguru import logger

from core.base import BaseAgent, AgentResult
from infrastructure.key_rotator import get_rotator
from tools.langchain_wrapper import create_langchain_tools


class LangChainAgent(BaseAgent):
    """Agent using LangChain create_agent (LangGraph) for tool calling."""

    def _get_api_key(self) -> str:
        return get_rotator().get_key()

    def _build_llm(self) -> ChatGroq:
        from config import get_settings
        settings = get_settings()
        return ChatGroq(
            api_key=self._get_api_key(),
            model=settings.groq_model,
            temperature=settings.groq_temperature,
            max_tokens=4096,
            timeout=60,
        )

    def _build_system_prompt(self) -> str:
        return self.system_prompt

    async def process(self, input_text: str, user_context: dict,
                      session_context: dict | None = None) -> AgentResult:
        key_count = max(1, get_rotator().key_count())
        last_error = None

        for attempt in range(key_count + 1):
            try:
                llm = self._build_llm()
                tools = create_langchain_tools(self.tools)
                system_prompt = self._build_system_prompt()

                agent = create_agent(
                    model=llm,
                    tools=tools,
                    system_prompt=system_prompt,
                )

                messages = [HumanMessage(content=input_text)]

                if session_context and session_context.get("history"):
                    for msg in session_context["history"][-6:]:
                        role = msg.get("role", "")
                        content = msg.get("content", "")
                        if role == "user" and content:
                            messages.insert(0, HumanMessage(content=content))
                        elif role == "assistant" and content:
                            messages.insert(0, AIMessage(content=content))

                result = await agent.ainvoke(
                    {"messages": messages},
                    {"recursion_limit": 12},
                )

                response_messages = result.get("messages", [])
                response = ""
                tool_calls = []
                for msg in response_messages:
                    if hasattr(msg, "content") and msg.content and getattr(msg, "type", "") != "human":
                        response = msg.content
                    if hasattr(msg, "tool_calls") and msg.tool_calls:
                        for tc in msg.tool_calls:
                            tool_calls.append({
                                "tool": tc.get("name", ""),
                                "arguments": tc.get("args", {}),
                                "result_preview": "",
                            })

                import re
                response = re.sub(r'\b(get_\w+|run_\w+)\b', '', response).strip()
                response = re.sub(r'\s+', ' ', response).strip()

                if session_context is not None and "history" in session_context:
                    session_context["history"].append({"role": "user", "content": input_text})
                    if response:
                        session_context["history"].append({"role": "assistant", "content": response})

                return AgentResult(
                    success=True,
                    agent_type=self.name,
                    response=response,
                    tool_calls=tool_calls,
                )

            except Exception as e:
                err_str = str(e)
                last_error = e
                if "429" in err_str or "rate limit" in err_str.lower() or "Request too large" in err_str:
                    logger.warning(f"LangChainAgent {self.name} attempt {attempt + 1} rate limited, rotating key: {err_str[:80]}")
                    if attempt < key_count:
                        await asyncio.sleep(1 + attempt)
                        continue
                raise

        logger.exception(f"LangChainAgent {self.name} all {key_count} keys exhausted: {last_error}")
        return AgentResult(
            success=False,
            agent_type=self.name,
            response="",
            error=f"LangChainAgent failed after {key_count} keys: {str(last_error)[:200]}",
        )

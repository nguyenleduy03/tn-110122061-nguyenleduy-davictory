import asyncio
import json
from dataclasses import dataclass
from typing import Any

from groq import AsyncGroq, RateLimitError
from loguru import logger

from config import get_settings
from infrastructure.key_rotator import get_rotator


@dataclass
class LLMResponse:
    content: str
    model: str
    provider: str = "groq"
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass
class ToolCallResult:
    content: str | None
    tool_calls: list[dict] | None = None
    model: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    finish_reason: str = "stop"


class AIProviderError(Exception):
    pass


class GroqClient:
    def __init__(self):
        self.settings = get_settings()

    def _get_client(self) -> AsyncGroq:
        api_key = get_rotator().get_key()
        return AsyncGroq(api_key=api_key, base_url=self.settings.groq_base_url)

    async def create_completion(self, messages: list[dict], model: str | None = None,
                                temperature: float | None = None, max_tokens: int | None = None,
                                tools: list[dict] | None = None,
                                tool_choice: str | dict | None = None,
                                response_format: dict | None = None) -> ToolCallResult:
        model = model or self.settings.groq_model
        last_error = None
        keys_count = get_rotator().key_count()

        for attempt in range(max(1, keys_count)):
            client = self._get_client()
            try:
                kwargs = dict(
                    model=model,
                    temperature=temperature if temperature is not None else self.settings.groq_temperature,
                    max_tokens=max_tokens or 4096,
                    timeout=30,
                    messages=messages,
                )
                if tools:
                    kwargs["tools"] = tools
                if tool_choice:
                    kwargs["tool_choice"] = tool_choice
                if response_format:
                    kwargs["response_format"] = response_format

                resp = await client.chat.completions.create(**kwargs)
                choice = resp.choices[0]
                msg = choice.message
                logger.debug(f"Groq response finish={choice.finish_reason}")
                logger.debug(f"Groq response content start: {repr(msg.content)[:300]}")
                logger.debug(f"Groq response content end: {repr(msg.content)[-200:] if msg.content and len(msg.content) > 200 else 'same'}")

                tool_calls = None
                if msg.tool_calls:
                    tool_calls = []
                    for tc in msg.tool_calls:
                        try:
                            args = json.loads(tc.function.arguments)
                        except json.JSONDecodeError:
                            args = {}
                        tool_calls.append({
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": args,
                            },
                        })

                return ToolCallResult(
                    content=msg.content,
                    tool_calls=tool_calls,
                    model=resp.model,
                    prompt_tokens=resp.usage.prompt_tokens if resp.usage else 0,
                    completion_tokens=resp.usage.completion_tokens if resp.usage else 0,
                    finish_reason=choice.finish_reason or "stop",
                )

            except RateLimitError as e:
                err_str = str(e).lower()
                # Daily limit → fail ngay, không retry vô ích
                if "tokens per day" in err_str:
                    raise AIProviderError(f"Daily rate limit exceeded: {e}")
                # Per-minute → chờ + retry
                last_error = e
                wait = 5 * (attempt + 1)
                logger.warning(f"Rate limit, waiting {wait}s (attempt {attempt + 1}): {e}")
                await asyncio.sleep(wait)
                continue
            except Exception as e:
                last_error = e
                logger.warning(f"Groq error, rotating key (attempt {attempt + 1}): {e}")
                continue

        raise AIProviderError(f"Groq failed after {max(1, keys_count)} attempts: {last_error}")

    async def create_vision_completion(self, messages: list[dict], model: str | None = None,
                                       temperature: float | None = None,
                                       max_tokens: int | None = None) -> ToolCallResult:
        model = model or self.settings.groq_vision_model
        last_error = None
        keys_count = get_rotator().key_count()

        for attempt in range(max(1, keys_count)):
            client = self._get_client()
            try:
                resp = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature if temperature is not None else self.settings.groq_temperature,
                    max_tokens=max_tokens or 1024,
                    timeout=30,
                )
                choice = resp.choices[0]
                return ToolCallResult(
                    content=choice.message.content,
                    model=resp.model,
                    prompt_tokens=resp.usage.prompt_tokens if resp.usage else 0,
                    completion_tokens=resp.usage.completion_tokens if resp.usage else 0,
                    finish_reason=choice.finish_reason or "stop",
                )
            except RateLimitError as e:
                if "tokens per day" in str(e).lower():
                    raise AIProviderError(f"Daily rate limit exceeded: {e}")
                last_error = e
                wait = 5 * (attempt + 1)
                logger.warning(f"Vision rate limit, waiting {wait}s (attempt {attempt + 1}): {e}")
                await asyncio.sleep(wait)
                continue
            except Exception as e:
                last_error = e
                logger.warning(f"Groq vision error, rotating key (attempt {attempt + 1}): {e}")
                continue

        raise AIProviderError(f"Groq vision failed after {max(1, keys_count)} attempts: {last_error}")

    async def create_stream(self, messages: list[dict], model: str | None = None,
                            temperature: float | None = None) -> Any:
        model = model or self.settings.groq_model
        api_key = get_rotator().get_key()
        client = AsyncGroq(api_key=api_key, base_url=self.settings.groq_base_url)
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature or self.settings.groq_temperature,
            stream=True,
            timeout=30,
        )
        return stream


_groq_client: GroqClient | None = None


def get_groq_client() -> GroqClient:
    global _groq_client
    if _groq_client is None:
        _groq_client = GroqClient()
    return _groq_client

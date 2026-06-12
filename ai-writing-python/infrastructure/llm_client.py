"""LLM clients for AI Writing Service - Groq + NVIDIA providers with key rotation."""

from dataclasses import dataclass
from groq import AsyncGroq, RateLimitError
from openai import AsyncOpenAI
from loguru import logger

from config import get_settings, get_active_model


@dataclass
class LLMResponse:
    content: str
    model: str
    provider: str = "groq"
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class AIProviderError(Exception):
    pass


class NvidiaClient:
    def __init__(self):
        self.settings = get_settings()
        key = self.settings.nvidia_api_key
        self.client = AsyncOpenAI(api_key=key, base_url=self.settings.nvidia_base_url) if key else None

    async def chat(self, system_prompt: str, user_prompt: str,
                   temperature: float | None = None, max_tokens: int | None = None) -> LLMResponse:
        if not self.client:
            raise AIProviderError("NVIDIA API key not configured")
        model = get_active_model() or self.settings.nvidia_model
        if model.startswith("nvidia/"):
            model = model[len("nvidia/"):]
        try:
            resp = await self.client.chat.completions.create(
                model=model,
                temperature=temperature if temperature is not None else self.settings.nvidia_temperature,
                max_tokens=(max_tokens if max_tokens is not None else self.settings.nvidia_max_tokens) or None,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            usage = resp.usage
            return LLMResponse(
                content=resp.choices[0].message.content or "",
                model=resp.model,
                provider="nvidia",
                prompt_tokens=usage.prompt_tokens if usage else 0,
                completion_tokens=usage.completion_tokens if usage else 0,
                total_tokens=usage.total_tokens if usage else 0,
            )
        except Exception as e:
            raise AIProviderError(f"NVIDIA API: {e}")


class GroqClient:
    def __init__(self):
        self.settings = get_settings()
        keys = self.settings.groq_api_keys
        self.clients: list[AsyncGroq] = [
            AsyncGroq(api_key=k, base_url=self.settings.groq_base_url) for k in keys
        ]
        if not self.clients:
            self.clients = [AsyncGroq(api_key="", base_url=self.settings.groq_base_url)]
        self._index = 0

    def _next(self) -> AsyncGroq:
        client = self.clients[self._index % len(self.clients)]
        self._index += 1
        return client

    async def chat(self, system_prompt: str, user_prompt: str,
                   temperature: float | None = None, max_tokens: int | None = None) -> LLMResponse:
        model = get_active_model() or self.settings.groq_model
        last_error = None
        for attempt in range(max(1, len(self.clients))):
            client = self._next()
            try:
                resp = await client.chat.completions.create(
                    model=model,
                    temperature=temperature if temperature is not None else self.settings.groq_temperature,
                    max_tokens=(max_tokens if max_tokens is not None else self.settings.groq_max_tokens) or None,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                )
                usage = resp.usage
                return LLMResponse(
                    content=resp.choices[0].message.content or "",
                    model=resp.model,
                    prompt_tokens=usage.prompt_tokens if usage else 0,
                    completion_tokens=usage.completion_tokens if usage else 0,
                    total_tokens=usage.total_tokens if usage else 0,
                )
            except RateLimitError as e:
                last_error = e
                logger.warning(f"Rate limit, rotating key (attempt {attempt + 1})")
                continue
            except Exception as e:
                last_error = e
                if attempt < len(self.clients) - 1:
                    logger.warning(f"Groq error, rotating key: {e}")
                    continue
        raise AIProviderError(f"Groq API failed after all attempts: {last_error}")

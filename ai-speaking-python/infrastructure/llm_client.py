"""LLM clients for AI Speaking Service - Groq (conversation) + OpenAI (scoring/STT/TTS)."""

from dataclasses import dataclass
from groq import AsyncGroq
from openai import AsyncOpenAI
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_settings


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
        s = get_settings()
        self.client = AsyncOpenAI(api_key=s.nvidia_api_key, base_url=s.nvidia_base_url) if s.nvidia_api_key else None

    async def chat(self, system: str, user: str, temperature: float | None = None,
                   max_tokens: int | None = None) -> LLMResponse:
        if not self.client:
            raise AIProviderError("NVIDIA API key not configured")
        s = get_settings()
        try:
            resp = await self.client.chat.completions.create(
                model=s.nvidia_model,
                temperature=temperature if temperature is not None else s.nvidia_temperature,
                max_tokens=max_tokens or s.nvidia_max_tokens,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            )
            usage = resp.usage
            return LLMResponse(content=resp.choices[0].message.content or "", model=resp.model,
                              provider="nvidia",
                              prompt_tokens=usage.prompt_tokens if usage else 0,
                              completion_tokens=usage.completion_tokens if usage else 0,
                              total_tokens=usage.total_tokens if usage else 0)
        except Exception as e:
            raise AIProviderError(f"NVIDIA API: {e}")


class GroqClient:
    def __init__(self):
        s = get_settings()
        keys = s.groq_api_keys
        self.clients = [AsyncGroq(api_key=k, base_url=s.groq_base_url) for k in keys]
        if not self.clients:
            self.clients = [AsyncGroq(api_key="", base_url=s.groq_base_url)]
        self._idx = 0

    def _next(self) -> AsyncGroq:
        c = self.clients[self._idx % len(self.clients)]
        self._idx += 1
        return c

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def chat(self, system: str, user: str, temperature: float | None = None,
                   max_tokens: int | None = None) -> LLMResponse:
        s = get_settings()
        client = self._next()
        try:
            resp = await client.chat.completions.create(
                model=s.groq_model,
                temperature=temperature if temperature is not None else s.groq_temperature,
                max_tokens=max_tokens or s.groq_max_tokens,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            )
            usage = resp.usage
            return LLMResponse(content=resp.choices[0].message.content or "", model=resp.model,
                              prompt_tokens=usage.prompt_tokens if usage else 0,
                              completion_tokens=usage.completion_tokens if usage else 0,
                              total_tokens=usage.total_tokens if usage else 0)
        except Exception as e:
            if len(self.clients) > 1:
                logger.warning(f"Groq key rotation: {e}")
                raise
            raise AIProviderError(f"Groq API: {e}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def transcribe(self, audio_data: bytes, filename: str = "audio.webm") -> dict:
        s = get_settings()
        client = self._next()
        try:
            resp = await client.audio.transcriptions.create(
                model=s.groq_stt_model, file=(filename, audio_data), response_format="verbose_json")
            return resp.model_dump() if hasattr(resp, "model_dump") else dict(resp)
        except Exception as e:
            logger.error(f"Groq STT failed: {e}")
            raise AIProviderError(f"Groq STT: {e}")

    async def synthesize(self, text: str, voice: str | None = None) -> bytes:
        s = get_settings()
        client = self._next()
        try:
            resp = await client.audio.speech.create(
                model=s.groq_tts_model, voice=voice or s.groq_tts_voice, input=text, response_format="wav")
            return resp.content
        except Exception as e:
            raise AIProviderError(f"Groq TTS: {e}")


class OpenAIClient:
    def __init__(self):
        s = get_settings()
        key = s.openai_api_key
        self.client = AsyncOpenAI(api_key=key, base_url=s.openai_base_url) if key else None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def chat(self, system: str, user: str, temperature: float | None = None,
                   max_tokens: int | None = None) -> LLMResponse:
        if not self.client:
            raise AIProviderError("OpenAI API key not configured")
        s = get_settings()
        try:
            resp = await self.client.chat.completions.create(
                model=s.openai_scoring_model,
                temperature=temperature if temperature is not None else s.openai_scoring_temperature,
                max_tokens=max_tokens or s.openai_scoring_max_tokens,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            )
            usage = resp.usage
            return LLMResponse(content=resp.choices[0].message.content or "", model=resp.model,
                              provider="openai",
                              prompt_tokens=usage.prompt_tokens if usage else 0,
                              completion_tokens=usage.completion_tokens if usage else 0,
                              total_tokens=usage.total_tokens if usage else 0)
        except Exception as e:
            raise AIProviderError(f"OpenAI API: {e}")

    async def transcribe(self, audio_data: bytes, filename: str = "audio.webm") -> dict:
        if not self.client:
            raise AIProviderError("OpenAI API key not configured")
        s = get_settings()
        try:
            resp = await self.client.audio.transcriptions.create(
                model=s.openai_stt_model, file=(filename, audio_data), response_format="verbose_json")
            return resp.model_dump() if hasattr(resp, "model_dump") else dict(resp)
        except Exception as e:
            raise AIProviderError(f"Whisper STT: {e}")

    async def synthesize(self, text: str, voice: str | None = None) -> bytes:
        if not self.client:
            raise AIProviderError("OpenAI API key not configured")
        s = get_settings()
        try:
            resp = await self.client.audio.speech.create(
                model=s.openai_tts_model, voice=voice or s.openai_tts_voice, input=text)
            return resp.content
        except Exception as e:
            raise AIProviderError(f"TTS: {e}")

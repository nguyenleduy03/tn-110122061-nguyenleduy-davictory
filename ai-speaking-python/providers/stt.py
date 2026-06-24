"""STT & TTS providers for AI Speaking Service."""

from loguru import logger
from infrastructure.llm_client import GroqClient, OpenAIClient, AIProviderError


class STTProvider:
    def __init__(self):
        self.client = GroqClient()

    async def transcribe(self, audio_data: bytes, filename: str = "audio.webm") -> dict:
        if not audio_data:
            raise ValueError("No audio data")
        try:
            result = await self.client.transcribe(audio_data, filename)
            logger.info(f"STT: {result.get('text', '')[:100]}...")
            return result
        except AIProviderError as e:
            raise


class TTSProvider:
    def __init__(self):
        self.client = GroqClient()

    async def synthesize(self, text: str, voice: str = "troy") -> bytes:
        if not text.strip():
            raise ValueError("No text for TTS")
        if len(text) > 200:
            raise ValueError("Text exceeds 200 character limit for Groq TTS")
        try:
            audio = await self.client.synthesize(text, voice)
            logger.info(f"TTS: {len(audio)} bytes")
            return audio
        except AIProviderError as e:
            raise

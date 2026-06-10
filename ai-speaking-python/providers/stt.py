"""STT & TTS providers for AI Speaking Service."""

from loguru import logger
from infrastructure.llm_client import OpenAIClient, AIProviderError


class STTProvider:
    def __init__(self):
        self.client = OpenAIClient()

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
        self.client = OpenAIClient()

    async def synthesize(self, text: str, voice: str = "alloy") -> bytes:
        if not text.strip():
            raise ValueError("No text for TTS")
        try:
            audio = await self.client.synthesize(text, voice)
            logger.info(f"TTS: {len(audio)} bytes")
            return audio
        except AIProviderError as e:
            raise

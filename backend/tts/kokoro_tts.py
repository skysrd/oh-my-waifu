"""Kokoro TTS 엔진 구현"""

import io
import logging

import numpy as np
import soundfile as sf

from .base import TTSEngine, TTSResult

logger = logging.getLogger(__name__)


class KokoroTTS(TTSEngine):
    """Kokoro TTS 엔진 (hexgrad/kokoro)"""

    SUPPORTED_LANGS = {"a", "b", "f", "j", "z", "k"}

    def __init__(self, config: dict):
        self.voice = config.get("kokoro", {}).get("voice", "af_heart")
        self.lang_code = config.get("kokoro", {}).get("lang_code", "a")
        self.sample_rate = config.get("sample_rate", 24000)
        self._pipeline = None

    async def initialize(self) -> None:
        try:
            from kokoro import KPipeline

            self._pipeline = KPipeline(lang_code=self.lang_code)
            logger.info(f"Kokoro TTS 초기화 완료 (voice={self.voice}, lang={self.lang_code})")
        except Exception as e:
            logger.error(f"Kokoro TTS 초기화 실패: {e}")
            raise

    async def synthesize(self, text: str) -> TTSResult:
        if self._pipeline is None:
            await self.initialize()

        audio_segments = []
        for output in self._pipeline(text, voice=self.voice):
            if output.audio is not None:
                audio_segments.append(output.audio)

        if not audio_segments:
            raise RuntimeError("Kokoro TTS: 오디오 생성 실패")

        audio = np.concatenate(audio_segments)
        duration = len(audio) / self.sample_rate

        buf = io.BytesIO()
        sf.write(buf, audio, self.sample_rate, format="WAV")
        wav_bytes = buf.getvalue()

        return TTSResult(audio=wav_bytes, sample_rate=self.sample_rate, duration=duration)

    async def get_available_voices(self) -> list[str]:
        return ["af_heart", "af_bella", "af_nicole", "am_adam", "am_michael"]

    def supports_language(self, lang_code: str) -> bool:
        return lang_code.lower() in self.SUPPORTED_LANGS

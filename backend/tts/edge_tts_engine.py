"""edge-tts 엔진 구현 (한국어 확실히 지원)"""

import io
import logging
import tempfile

import soundfile as sf

from .base import TTSEngine, TTSResult

logger = logging.getLogger(__name__)


class EdgeTTSEngine(TTSEngine):
    """Microsoft Edge TTS 엔진"""

    SUPPORTED_LANGS = {"ko", "en", "ja", "zh", "fr", "de", "es", "it", "pt", "ru"}

    def __init__(self, config: dict):
        self.voice = config.get("edge_tts", {}).get("voice", "ko-KR-SunHiNeural")
        self.sample_rate = config.get("sample_rate", 24000)

    async def synthesize(self, text: str) -> TTSResult:
        import edge_tts

        communicate = edge_tts.Communicate(text, self.voice)

        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]

        if not audio_data:
            raise RuntimeError("edge-tts: 오디오 생성 실패")

        # edge-tts는 MP3를 반환하므로 WAV로 변환
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=True) as tmp:
            tmp.write(audio_data)
            tmp.flush()
            data, original_sr = sf.read(tmp.name)

        buf = io.BytesIO()
        sf.write(buf, data, original_sr, format="WAV")
        wav_bytes = buf.getvalue()
        duration = len(data) / original_sr

        return TTSResult(audio=wav_bytes, sample_rate=original_sr, duration=duration)

    async def get_available_voices(self) -> list[str]:
        return [
            "ko-KR-SunHiNeural",
            "ko-KR-InJoonNeural",
            "ko-KR-HyunsuNeural",
            "ko-KR-BongJinNeural",
        ]

    def supports_language(self, lang_code: str) -> bool:
        return lang_code.lower() in self.SUPPORTED_LANGS

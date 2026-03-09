"""Whisper STT (Speech-to-Text) 래퍼

faster-whisper를 사용하여 오디오를 텍스트로 변환한다.
"""

import io
import logging
import tempfile

import numpy as np
import soundfile as sf

logger = logging.getLogger(__name__)


class WhisperSTT:
    def __init__(self, config: dict):
        stt_config = config.get("stt", {})
        self.model_size = stt_config.get("model_size", "base")
        self.language = stt_config.get("language", "ko")
        self.device = stt_config.get("device", "cpu")
        self._model = None

    async def initialize(self) -> None:
        from faster_whisper import WhisperModel

        self._model = WhisperModel(
            self.model_size,
            device=self.device,
            compute_type="int8" if self.device == "cpu" else "float16",
        )
        logger.info(f"Whisper STT 초기화 완료 (model={self.model_size}, device={self.device})")

    async def transcribe(self, audio_bytes: bytes) -> str:
        """WAV/PCM 오디오를 텍스트로 변환한다."""
        if self._model is None:
            await self.initialize()

        # WAV 바이트를 임시 파일로 저장 (faster-whisper는 파일 경로 필요)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
            tmp.write(audio_bytes)
            tmp.flush()
            segments, info = self._model.transcribe(
                tmp.name,
                language=self.language,
                beam_size=5,
                vad_filter=True,
            )
            text = " ".join(segment.text.strip() for segment in segments)

        logger.debug(f"STT 결과: '{text}' (lang={info.language}, prob={info.language_probability:.2f})")
        return text

    async def transcribe_pcm(self, pcm_data: bytes, sample_rate: int = 16000) -> str:
        """Raw PCM(int16) 데이터를 텍스트로 변환한다."""
        audio = np.frombuffer(pcm_data, dtype=np.int16).astype(np.float32) / 32768.0

        buf = io.BytesIO()
        sf.write(buf, audio, sample_rate, format="WAV")
        return await self.transcribe(buf.getvalue())

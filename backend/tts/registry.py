"""TTS 엔진 레지스트리 및 팩토리

config.yaml의 tts.engine 값에 따라 적절한 TTS 엔진을 생성한다.
새 엔진 추가 시 TTS_ENGINES 딕셔너리에 등록만 하면 된다.
"""

import logging

from .base import TTSEngine
from .edge_tts_engine import EdgeTTSEngine
from .kokoro_tts import KokoroTTS

logger = logging.getLogger(__name__)

TTS_ENGINES: dict[str, type[TTSEngine]] = {
    "kokoro": KokoroTTS,
    "edge-tts": EdgeTTSEngine,
}


def create_tts_engine(config: dict) -> TTSEngine:
    """설정에 따라 TTS 엔진 인스턴스를 생성한다."""
    tts_config = config.get("tts", {})
    engine_name = tts_config.get("engine", "edge-tts")

    if engine_name not in TTS_ENGINES:
        available = ", ".join(TTS_ENGINES.keys())
        raise ValueError(f"알 수 없는 TTS 엔진: '{engine_name}'. 사용 가능: {available}")

    engine_cls = TTS_ENGINES[engine_name]
    engine = engine_cls(tts_config)
    logger.info(f"TTS 엔진 생성: {engine_name} ({engine_cls.__name__})")
    return engine

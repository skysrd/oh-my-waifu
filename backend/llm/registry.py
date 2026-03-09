"""LLM 엔진 레지스트리 및 팩토리

config.yaml의 llm.engine 값에 따라 적절한 LLM 엔진을 생성한다.
새 엔진 추가 시 LLM_ENGINES 딕셔너리에 등록만 하면 된다.
"""

import logging

from .base import LLMEngine
from .copilot import CopilotEngine
from .openai_compat import OpenAICompatEngine

logger = logging.getLogger(__name__)

LLM_ENGINES: dict[str, type[LLMEngine]] = {
    "openclaw": OpenAICompatEngine,
    "ollama": OpenAICompatEngine,
    "openai": OpenAICompatEngine,
    "copilot": CopilotEngine,
}

# 프로바이더별 기본 URL
DEFAULT_URLS = {
    "openclaw": "http://127.0.0.1:18789",
    "ollama": "http://127.0.0.1:11434",
    "openai": "https://api.openai.com",
}


def create_llm_engine(config: dict) -> LLMEngine:
    """설정에 따라 LLM 엔진 인스턴스를 생성한다."""
    llm_config = config.get("llm", {})
    engine_name = llm_config.get("engine", "ollama")

    if engine_name not in LLM_ENGINES:
        available = ", ".join(LLM_ENGINES.keys())
        raise ValueError(f"알 수 없는 LLM 엔진: '{engine_name}'. 사용 가능: {available}")

    # 엔진별 설정 추출
    engine_specific = llm_config.get(engine_name, {})

    # OpenAI 호환 엔진은 기본 URL 설정
    if engine_name in DEFAULT_URLS and "url" not in engine_specific:
        engine_specific["url"] = DEFAULT_URLS[engine_name]

    engine_cls = LLM_ENGINES[engine_name]
    engine = engine_cls(engine_specific)
    logger.info(f"LLM 엔진 생성: {engine_name} ({engine_cls.__name__})")
    return engine

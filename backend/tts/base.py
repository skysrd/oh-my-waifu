"""TTS 엔진 추상 인터페이스

새로운 TTS 엔진 추가 시 TTSEngine을 상속하고 추상 메서드를 구현한다.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class TTSResult:
    """TTS 합성 결과"""

    audio: bytes
    sample_rate: int
    duration: float


class TTSEngine(ABC):
    """TTS 엔진 플러그인 인터페이스"""

    @abstractmethod
    async def synthesize(self, text: str) -> TTSResult:
        """텍스트를 오디오로 변환한다."""
        ...

    @abstractmethod
    async def get_available_voices(self) -> list[str]:
        """사용 가능한 음성 목록을 반환한다."""
        ...

    @abstractmethod
    def supports_language(self, lang_code: str) -> bool:
        """특정 언어 지원 여부를 반환한다."""
        ...

    async def initialize(self) -> None:
        """엔진 초기화 (모델 로드 등). 필요 시 오버라이드."""
        pass

    async def shutdown(self) -> None:
        """엔진 종료 (리소스 해제). 필요 시 오버라이드."""
        pass

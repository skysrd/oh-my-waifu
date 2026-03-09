"""LLM 엔진 추상 인터페이스

새로운 LLM 프로바이더 추가 시 LLMEngine을 상속하고 추상 메서드를 구현한다.
"""

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator


class LLMEngine(ABC):
    """LLM 엔진 플러그인 인터페이스"""

    @abstractmethod
    async def chat_stream(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        """스트리밍 채팅 응답을 반환한다. 각 yield는 텍스트 청크."""
        ...

    async def chat(self, messages: list[dict]) -> str:
        """전체 응답 텍스트를 반환한다."""
        full = ""
        async for chunk in self.chat_stream(messages):
            full += chunk
        return full

    async def initialize(self) -> None:
        """엔진 초기화. 필요 시 오버라이드."""
        pass

    async def shutdown(self) -> None:
        """엔진 종료. 필요 시 오버라이드."""
        pass

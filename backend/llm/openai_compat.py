"""OpenAI 호환 LLM 엔진

OpenClaw, Ollama, OpenAI API 등 /v1/chat/completions 엔드포인트를 사용하는
모든 프로바이더를 지원한다.
"""

import json
import logging
from collections.abc import AsyncGenerator

import httpx

from .base import LLMEngine

logger = logging.getLogger(__name__)


class OpenAICompatEngine(LLMEngine):
    """OpenAI 호환 API를 사용하는 범용 LLM 엔진"""

    def __init__(self, config: dict):
        self.base_url = config.get("url", "http://127.0.0.1:11434").rstrip("/")
        self.model = config.get("model", "")
        self.api_key = config.get("api_key", "")
        self.timeout = config.get("timeout", 120)
        self.headers = {"Content-Type": "application/json"}
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"

    async def chat_stream(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
        }
        url = f"{self.base_url}/v1/chat/completions"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", url, json=payload, headers=self.headers) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue

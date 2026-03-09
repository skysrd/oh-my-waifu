"""OpenClaw Gateway 클라이언트

OpenAI 호환 API (`/v1/chat/completions`)를 통해 OpenClaw Gateway와 통신한다.
"""

from collections.abc import AsyncGenerator

import httpx


class OpenClawClient:
    def __init__(self, base_url: str, api_key: str = "", model: str = "default"):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.headers = {"Content-Type": "application/json"}
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"

    async def chat(self, messages: list[dict], stream: bool = True) -> AsyncGenerator[str, None]:
        """OpenClaw에 채팅 메시지를 보내고 스트리밍 응답을 반환한다."""
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": stream,
        }
        url = f"{self.base_url}/v1/chat/completions"

        async with httpx.AsyncClient(timeout=120.0) as client:
            if stream:
                async with client.stream("POST", url, json=payload, headers=self.headers) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                break
                            yield data
            else:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                yield content

    async def chat_simple(self, user_message: str, system_prompt: str = "") -> str:
        """단일 메시지를 보내고 전체 응답 텍스트를 반환한다."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_message})

        import json

        full_response = ""
        async for chunk_data in self.chat(messages, stream=True):
            try:
                chunk = json.loads(chunk_data)
                delta = chunk.get("choices", [{}])[0].get("delta", {})
                content = delta.get("content", "")
                full_response += content
            except json.JSONDecodeError:
                continue

        return full_response

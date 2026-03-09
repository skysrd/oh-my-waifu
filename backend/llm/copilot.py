"""GitHub Copilot LLM 엔진

로컬에 설치된 GitHub Copilot의 OAuth 토큰을 사용하여
Copilot Chat Completions API에 접근한다.

인증 흐름:
1. ~/.config/github-copilot/apps.json에서 OAuth 토큰 읽기
2. GitHub API로 단기 Copilot 세션 토큰 교환
3. api.githubcopilot.com/chat/completions 호출
"""

import json
import logging
import time
from collections.abc import AsyncGenerator
from pathlib import Path

import httpx

from .base import LLMEngine

logger = logging.getLogger(__name__)

COPILOT_TOKEN_URL = "https://api.github.com/copilot_internal/v2/token"
COPILOT_CHAT_URL = "https://api.githubcopilot.com/chat/completions"


class CopilotEngine(LLMEngine):
    """GitHub Copilot LLM 엔진"""

    def __init__(self, config: dict):
        self.model = config.get("model", "gpt-4o")
        self.timeout = config.get("timeout", 120)

        # OAuth 토큰 소스
        self._oauth_token = config.get("oauth_token", "")
        self._token_path = config.get(
            "token_path",
            str(Path.home() / ".config" / "github-copilot" / "apps.json"),
        )

        # 캐싱된 Copilot 세션 토큰
        self._session_token = None
        self._token_expires_at = 0

    async def initialize(self) -> None:
        if not self._oauth_token:
            self._oauth_token = self._load_oauth_token()

        if not self._oauth_token:
            raise RuntimeError(
                "GitHub Copilot OAuth 토큰을 찾을 수 없습니다. "
                "VS Code에서 GitHub Copilot에 로그인하거나, "
                "config.yaml의 llm.copilot.oauth_token에 직접 설정하세요."
            )

        await self._refresh_session_token()
        logger.info(f"GitHub Copilot 엔진 초기화 완료 (model={self.model})")

    def _load_oauth_token(self) -> str:
        """로컬 Copilot 설정에서 OAuth 토큰을 읽는다."""
        path = Path(self._token_path)
        if not path.exists():
            # hosts.json 시도 (구버전 호환)
            alt = path.parent / "hosts.json"
            if alt.exists():
                path = alt
            else:
                logger.warning(f"Copilot 토큰 파일 없음: {self._token_path}")
                return ""

        try:
            with open(path) as f:
                data = json.load(f)

            # apps.json: {"github.com:AppId": {"oauth_token": "gho_xxx"}}
            # hosts.json: {"github.com": {"oauth_token": "gho_xxx"}}
            for key, value in data.items():
                if "github.com" in key and "oauth_token" in value:
                    token = value["oauth_token"]
                    logger.info(f"Copilot OAuth 토큰 로드됨 (source={path.name}, key={key[:30]}...)")
                    return token

        except Exception as e:
            logger.error(f"Copilot 토큰 파일 읽기 실패: {e}")

        return ""

    async def _refresh_session_token(self) -> None:
        """GitHub OAuth 토큰 → 단기 Copilot 세션 토큰 교환"""
        if self._session_token and time.time() < self._token_expires_at - 60:
            return

        headers = {
            "Authorization": f"token {self._oauth_token}",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(COPILOT_TOKEN_URL, headers=headers)
            response.raise_for_status()
            data = response.json()

        self._session_token = data.get("token", "")
        self._token_expires_at = data.get("expires_at", time.time() + 1800)
        logger.debug("Copilot 세션 토큰 갱신 완료")

    async def chat_stream(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        await self._refresh_session_token()

        headers = {
            "Authorization": f"Bearer {self._session_token}",
            "Content-Type": "application/json",
            "Copilot-Integration-Id": "vscode-chat",
            "Editor-Version": "vscode/1.100.0",
            "Editor-Plugin-Version": "copilot-chat/0.24.0",
            "Openai-Intent": "conversation-panel",
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "temperature": 0.7,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", COPILOT_CHAT_URL, json=payload, headers=headers) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                            content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue

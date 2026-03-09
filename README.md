# Oh My Waifu - AI 아바타 어시스턴트

로컬에서 동작하는 AI 아바타 어시스턴트 시스템. 3D VRM 캐릭터가 TTS 음성과 lipsync로 대화하며, OpenClaw를 통해 LLM 추론 및 툴 실행을 수행한다.

## 아키텍처

```
Web Frontend (React + Three.js + VRM)
    ↕ WebSocket
FastAPI Backend (Python)
    ↕ HTTP (OpenAI 호환)
OpenClaw Gateway → ollama (qwen3.5:9b)
```

## 요구사항

- macOS (Apple Silicon)
- Python 3.11+
- Node.js 18+
- ollama (qwen3.5:9b)
- OpenClaw Gateway (별도 서버)

## 빠른 시작

### 1. 백엔드

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

### 3. 설정

`config.yaml`에서 OpenClaw Gateway URL, TTS 엔진, STT 모델 등을 설정한다.

## VRM 캐릭터

`models/` 디렉토리에 `.vrm` 파일을 배치하고, `config.yaml`의 `avatar.vrm_path`를 수정한다.
VRoid Hub(https://hub.vroid.com/)에서 다운로드 가능.

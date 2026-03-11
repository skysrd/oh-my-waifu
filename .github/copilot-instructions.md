# Copilot Instructions — Oh My Waifu

## Interaction modes

### Conversation mode (default)

Brainstorming, analysis, Q&A 등 대화 중심 상호작용.

- 코드 변경이나 파일 수정을 하지 않는다
- 사용자가 명시적으로 구현을 요청하면 구현 모드로 전환한다

### Implementation mode

사용자의 명시적 승인을 받은 후에만 코드를 변경한다.

- 컴파일되지 않는 코드 커밋 금지
- 사용하지 않는 import, 변수, 메서드는 즉시 삭제
- `.env`, 인증 정보 등 보안 민감 파일 커밋 금지
- 주석은 최소화, why만 남길 것
- TODO/FIX 주석에는 날짜와 작성자 포함 (예: `// TODO 2026-03-11 skysrd: ...`)

### Documentation mode

- 기존 포맷과 일관성 유지
- 다이어그램은 mermaid 사용
- 추측 금지, 불확실한 내용은 사용자에게 확인

### Verification mode (review, debug, test)

- 코드 리뷰 시 [품질], [보안], [비즈니스] 카테고리 + 심각도(경고/주의/사소) 태그
  - 예: `[보안/경고] SQL 인젝션 가능성 있음`
- 디버깅: 근본 원인 파악 전까지 코드 수정 금지. 가설 → 검증 → 수정 순서
- 동일 명령 무작정 재시도 금지. 해결 안 되면 상황 보고 및 대안 제시
- 테스트 비활성화는 사용자의 명시적 승인 후에만

### Common principles

- 불확실하면 실행 전에 먼저 질문하라
- 옵션을 제시하되, 특정 선택지에 편향을 보이지 마라
- 사실적 정확성 우선, 불확실성은 명시하라
- 과도한 복잡성이나 잘못된 방향이 보이면 적극적으로 경고하라

## Commit convention

- 커밋 메시지는 한글로 작성
- 형식: `<type>: <subject>`
- type: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- 예: `feat: 사용자 인증 기능 추가`

## Tool usage priorities

1. 라이브러리 문서: Context7 → 실패 시 WebFetch/WebSearch
2. 외부 서비스: MCP 도구 우선 → API 직접 호출
3. 코드베이스 탐색: Glob/Grep 직접 사용 → 복잡한 탐색은 Explore agent
4. 라이브러리 설치/업그레이드 시 기존 의존성과 호환되는지 확인 후 적용

---

## Commands

### Run everything

```bash
./start.sh          # Starts backend (port 8000) + frontend (port 5173)
```

### Backend (FastAPI)

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

Python 3.11 is required — the venv is created with `/opt/homebrew/opt/python@3.11/bin/python3.11`. System Python 3.14 is incompatible with ML dependencies (kokoro, faster-whisper).

### Frontend (Vite + React)

```bash
cd frontend
npm run dev          # Dev server with HMR
npm run build        # Production build
npm run lint         # ESLint
```

No test suites exist yet.

## Architecture

**Data flow:** Browser → WebSocket → FastAPI → LLM/TTS/STT → WebSocket → Browser

The backend (`backend/main.py`) is a FastAPI app with a single WebSocket endpoint (`/ws`) that orchestrates all services. The frontend (`frontend/`) is a React app that renders a 3D VRM character via Three.js and communicates over that WebSocket.

### Plugin systems

Both LLM and TTS use the same registry-based plugin pattern:

1. **ABC base class** — `llm/base.py` (`LLMEngine`) / `tts/base.py` (`TTSEngine`)
2. **Concrete implementations** — one file per provider
3. **Registry + factory** — `registry.py` maps config string → class, `create_*_engine(config)` instantiates

To add a new provider: create a class implementing the ABC, add it to the `*_ENGINES` dict in `registry.py`, and add a config section in `config.yaml`.

LLM engines: `ollama`, `openclaw`, `openai` (all share `OpenAICompatEngine` since they're OpenAI-compatible), `copilot` (`CopilotEngine` with OAuth token auto-discovery).

TTS engines: `edge-tts` (default, reliable Korean support), `kokoro`.

### WebSocket protocol

Messages are JSON with a `type` field. Frontend sends:
- `{ type: "chat", message: "..." }` — text input
- `{ type: "audio", data: "<base64>" }` — voice input (16kHz mono WAV)

Backend responds with a sequence:
1. `chat_response` (streamed chunks, `done: false` → `done: true`)
2. `emotion` (detected emotion string)
3. `tts_audio` (base64 WAV + sample_rate + duration)
4. `lipsync` (array of `{ time, blendshapes }` frames)

### Avatar animation system

`frontend/src/lib/avatar.js` (`AvatarController`) manages all character animation:

- **Idle motion** — breathing (chest/spine sine), head sway, random eye gaze
- **Blink** — random interval (3-7s), smooth open/close curve
- **Emotion** — VRM expression presets with smooth transitions, driven by backend `emotion.py` keyword analysis
- **Gestures** — bone keyframe interpolation engine, presets defined in `gestures.js` (nod, think, wave, bow, shrug, listenNod)
- **Reactions** — conversation state machine (idle → listening → thinking → responding → done) triggers emotions/gestures automatically

Lipsync uses rhubarb-lip-sync CLI if available, otherwise a volume-based fallback. Visemes map to VRM presets: aa→Aa, ee→Ee, ih→Ih, oh→Oh, ou→Ou.

### VRM model serving

VRM files must be in `frontend/public/models/` for Vite static serving. The `models/` dir at project root is for storage only. Vite proxies `/ws` and `/api` routes to the backend at `localhost:8000`.

## Conventions

- **Config-driven** — all engine selection and tuning goes through `config.yaml`, not code changes
- **Korean-first** — default language for STT, TTS voice, system prompt, and all code comments/log messages are in Korean
- **Async everywhere** — all backend I/O is async. TTS/LLM/STT engines must implement async methods
- **No TypeScript** — frontend is vanilla JS with React hooks; no `.ts`/`.tsx` files

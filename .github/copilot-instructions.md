# Copilot Instructions — Oh My Waifu

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
- **Commit messages** — written in Korean with a summary line and body
- **Async everywhere** — all backend I/O is async. TTS/LLM/STT engines must implement async methods
- **No TypeScript** — frontend is vanilla JS with React hooks; no `.ts`/`.tsx` files

# Oh My Waifu

> Your local AI waifu, fully self-hosted.

A self-hosted AI avatar assistant with a 3D VRM character that speaks via TTS with real-time lipsync. Supports multiple LLM backends and TTS engines through a plugin architecture.

## Architecture

```
React + Three.js + VRM (Browser)
        ↕ WebSocket
FastAPI Backend (Python)
        ↕ OpenAI-compatible API
LLM Provider (Ollama / OpenAI / GitHub Copilot / OpenClaw)
```

## Features

- **3D Avatar** — VRM character rendering with idle animations and eye blinking
- **Lipsync** — Real-time mouth movement synced to TTS audio (rhubarb-lip-sync or volume-based fallback)
- **Voice Input** — Browser-based STT via faster-whisper with voice activity detection
- **Pluggable LLM** — Ollama, OpenAI API, GitHub Copilot, OpenClaw (config-switchable)
- **Pluggable TTS** — Kokoro, Edge TTS (config-switchable)
- **Streaming** — Token-by-token LLM responses via WebSocket

## Prerequisites

- Python 3.10+
- Node.js 18+
- An LLM backend (e.g., [Ollama](https://ollama.com))
- A VRM character model (download from [VRoid Hub](https://hub.vroid.com))

## Quick Start

```bash
# 1. Clone
git clone https://github.com/skysrd/oh-my-waifu.git
cd oh-my-waifu

# 2. Place your VRM model
cp /path/to/your-character.vrm frontend/public/models/avatar.vrm

# 3. Run
./start.sh
```

Open **http://localhost:5173** in your browser.

### Manual Setup

<details>
<summary>Backend</summary>

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

</details>

<details>
<summary>Frontend</summary>

```bash
cd frontend
npm install
npm run dev
```

</details>

## Configuration

All settings are managed in `config.yaml`.

### LLM Provider

```yaml
llm:
  engine: "ollama"          # "ollama" | "openai" | "copilot" | "openclaw"

  ollama:
    url: "http://127.0.0.1:11434"
    model: "qwen3:8b"

  openai:
    api_key: "sk-..."
    model: "gpt-4o"

  copilot:
    model: "gpt-4o"         # Uses local VS Code Copilot token automatically
```

### TTS Engine

```yaml
tts:
  engine: "edge-tts"        # "edge-tts" | "kokoro"

  edge_tts:
    voice: "ko-KR-SunHiNeural"

  kokoro:
    voice: "af_heart"
    lang_code: "a"
```

### Other Settings

| Key | Description |
|-----|-------------|
| `stt.model_size` | Whisper model: `tiny`, `base`, `small`, `medium`, `large-v3` |
| `stt.language` | Recognition language (e.g., `ko`, `en`, `ja`) |
| `lipsync.method` | `rhubarb` (accurate) or `simple` (volume-based fallback) |
| `avatar.vrm_path` | Path to VRM character model |

## Project Structure

```
backend/
├── main.py              # FastAPI app (WebSocket + REST)
├── llm/                 # LLM plugin architecture
│   ├── base.py          #   LLMEngine ABC
│   ├── openai_compat.py #   Ollama / OpenAI / OpenClaw
│   └── copilot.py       #   GitHub Copilot
├── tts/                 # TTS plugin architecture
│   ├── base.py          #   TTSEngine ABC
│   ├── kokoro_tts.py    #   Kokoro TTS
│   └── edge_tts_engine.py # Edge TTS
├── stt.py               # faster-whisper STT
└── lipsync.py           # Lipsync data generation

frontend/src/
├── components/
│   └── AvatarCanvas.jsx # Three.js + VRM canvas
├── hooks/
│   ├── useWebSocket.js  # Real-time communication
│   ├── useAudio.js      # Mic capture + TTS playback
│   └── useLipsync.js    # Lipsync synchronization
└── lib/
    ├── avatar.js        # VRM blendshape control
    ├── audio.js         # Audio utilities (WAV encode, VAD)
    └── ws.js            # WebSocket client
```

## Adding a New LLM or TTS Provider

Both LLM and TTS use the same plugin pattern. To add a new provider:

1. Create a class implementing `LLMEngine` or `TTSEngine`
2. Register it in the corresponding `registry.py`
3. Add a config section in `config.yaml`

## License

MIT

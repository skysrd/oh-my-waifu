"""FastAPI 메인 앱

WebSocket 엔드포인트 및 REST API를 제공한다.
"""

import base64
import json
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import load_config
from emotion import detect_emotion
from lipsync import LipsyncGenerator
from llm import create_llm_engine
from stt import WhisperSTT
from tts import create_tts_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

config = load_config()

app = FastAPI(title="Oh My Waifu - AI Avatar Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config["server"]["cors_origins"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 서비스 초기화
llm_engine = create_llm_engine(config)
tts_engine = create_tts_engine(config)
stt_engine = WhisperSTT(config)
lipsync_gen = LipsyncGenerator(config)


@app.on_event("startup")
async def startup():
    await llm_engine.initialize()
    await tts_engine.initialize()
    logger.info("서버 시작 완료")


@app.on_event("shutdown")
async def shutdown():
    await llm_engine.shutdown()
    await tts_engine.shutdown()


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/config")
async def get_config():
    """프론트엔드용 설정 반환"""
    return {
        "avatar": config.get("avatar", {}),
        "tts": {"engine": config["tts"]["engine"]},
        "llm": {"engine": config["llm"]["engine"]},
    }


@app.post("/api/chat")
async def chat(body: dict):
    """REST 채팅 엔드포인트 (테스트용)"""
    message = body.get("message", "")
    if not message:
        return JSONResponse({"error": "message required"}, status_code=400)

    response = await llm_engine.chat(
        [{"role": "user", "content": message}]
    )
    return {"response": response}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    logger.info("WebSocket 연결됨")

    # 대화 히스토리
    messages: list[dict] = [
        {"role": "system", "content": "당신은 친절한 AI 어시스턴트입니다. 한국어로 대화합니다."},
    ]

    try:
        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type")

            if msg_type == "chat":
                await _handle_chat(ws, data, messages)
            elif msg_type == "audio":
                await _handle_audio(ws, data, messages)
            else:
                await ws.send_json({"type": "error", "message": f"알 수 없는 타입: {msg_type}"})

    except WebSocketDisconnect:
        logger.info("WebSocket 연결 해제")
    except Exception as e:
        logger.error(f"WebSocket 오류: {e}")
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


async def _handle_chat(ws: WebSocket, data: dict, messages: list[dict]):
    """텍스트 채팅 처리"""
    user_msg = data.get("message", "")
    if not user_msg:
        return

    messages.append({"role": "user", "content": user_msg})

    # LLM 스트리밍 응답
    full_response = ""
    async for content in llm_engine.chat_stream(messages):
        full_response += content
        await ws.send_json({"type": "chat_response", "text": content, "done": False})

    await ws.send_json({"type": "chat_response", "text": "", "done": True})
    messages.append({"role": "assistant", "content": full_response})

    # 감정 분석
    emotion = detect_emotion(full_response)
    await ws.send_json({"type": "emotion", "emotion": emotion})

    # TTS + Lipsync 생성
    if full_response.strip():
        try:
            tts_result = await tts_engine.synthesize(full_response)
            lipsync_data = await lipsync_gen.generate(tts_result.audio)

            audio_b64 = base64.b64encode(tts_result.audio).decode("utf-8")
            await ws.send_json({
                "type": "tts_audio",
                "data": audio_b64,
                "sample_rate": tts_result.sample_rate,
                "duration": tts_result.duration,
            })
            await ws.send_json({
                "type": "lipsync",
                "data": lipsync_data,
            })
        except Exception as e:
            logger.error(f"TTS/Lipsync 오류: {e}")
            await ws.send_json({"type": "error", "message": f"TTS 오류: {e}"})


async def _handle_audio(ws: WebSocket, data: dict, messages: list[dict]):
    """음성 입력 처리 (STT → Chat)"""
    audio_b64 = data.get("data", "")
    if not audio_b64:
        return

    try:
        audio_bytes = base64.b64decode(audio_b64)
        text = await stt_engine.transcribe(audio_bytes)

        if text.strip():
            await ws.send_json({"type": "stt_result", "text": text})
            await _handle_chat(ws, {"message": text}, messages)
    except Exception as e:
        logger.error(f"STT 오류: {e}")
        await ws.send_json({"type": "error", "message": f"STT 오류: {e}"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=config["server"]["host"],
        port=config["server"]["port"],
        reload=True,
    )

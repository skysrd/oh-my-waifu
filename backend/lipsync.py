"""Lipsync 데이터 생성

오디오를 분석하여 VRM blendshape용 lipsync 데이터를 생성한다.
rhubarb-lip-sync CLI 또는 볼륨 기반 단순 분석을 지원한다.
"""

import asyncio
import io
import json
import logging
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

logger = logging.getLogger(__name__)

# rhubarb 출력 포맷 → VRM blendshape 매핑
RHUBARB_TO_VRM = {
    "A": {"aa": 1.0},                    # 입 크게 열림 (아)
    "B": {"aa": 0.3, "oh": 0.2},         # 입 살짝 열림 (음, 브)
    "C": {"ee": 0.8},                     # 이 보이는 발음 (이)
    "D": {"aa": 0.5, "oh": 0.3},         # 입 중간 (애)
    "E": {"oh": 0.8},                     # 둥근 입 (오)
    "F": {"ou": 0.9},                     # 입술 앞으로 (우)
    "G": {"ee": 0.4, "oh": 0.3},         # 혀 올림 (으)
    "H": {"aa": 0.1},                     # 입 거의 닫힘 (ㄹ)
    "X": {},                               # 입 닫힘 (무음)
}


class LipsyncGenerator:
    def __init__(self, config: dict):
        lipsync_config = config.get("lipsync", {})
        self.method = lipsync_config.get("method", "simple")
        self.rhubarb_path = lipsync_config.get("rhubarb_path", "/usr/local/bin/rhubarb")

    async def generate(self, audio_bytes: bytes) -> list[dict]:
        """오디오에서 lipsync 데이터를 생성한다."""
        if self.method == "rhubarb" and Path(self.rhubarb_path).exists():
            return await self._generate_rhubarb(audio_bytes)
        return await self._generate_simple(audio_bytes)

    async def _generate_rhubarb(self, audio_bytes: bytes) -> list[dict]:
        """rhubarb-lip-sync CLI로 lipsync 데이터 생성"""
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            proc = await asyncio.create_subprocess_exec(
                self.rhubarb_path, tmp_path, "-f", "json", "--machineReadable",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                logger.warning(f"rhubarb 실패: {stderr.decode()}, simple 모드로 전환")
                return await self._generate_simple(audio_bytes)

            result = json.loads(stdout.decode())
            return self._convert_rhubarb_to_vrm(result.get("mouthCues", []))
        except Exception as e:
            logger.warning(f"rhubarb 오류: {e}, simple 모드로 전환")
            return await self._generate_simple(audio_bytes)
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    def _convert_rhubarb_to_vrm(self, mouth_cues: list[dict]) -> list[dict]:
        """rhubarb JSON 결과를 VRM blendshape 포맷으로 변환"""
        result = []
        for cue in mouth_cues:
            time = cue.get("start", 0)
            shape = cue.get("value", "X")
            blendshapes = RHUBARB_TO_VRM.get(shape, {})
            result.append({"time": time, "blendshapes": blendshapes})
        return result

    async def _generate_simple(self, audio_bytes: bytes) -> list[dict]:
        """볼륨 기반 단순 lipsync (rhubarb 없이)"""
        data, sr = sf.read(io.BytesIO(audio_bytes))

        if data.ndim > 1:
            data = data.mean(axis=1)

        # 30fps 간격으로 볼륨 분석
        frame_duration = 1.0 / 30
        frame_samples = int(sr * frame_duration)
        result = []

        for i in range(0, len(data), frame_samples):
            frame = data[i:i + frame_samples]
            if len(frame) == 0:
                break
            volume = float(np.sqrt(np.mean(frame ** 2)))
            # 볼륨을 0~1로 정규화 (임계값 기반)
            mouth_open = min(1.0, max(0.0, volume * 10))
            time = i / sr
            result.append({
                "time": time,
                "blendshapes": {"aa": mouth_open * 0.8, "oh": mouth_open * 0.3},
            })

        return result

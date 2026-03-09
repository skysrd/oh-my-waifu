import { useRef, useState, useCallback } from "react";
import { AudioManager } from "../lib/audio";

/**
 * 오디오 관리 훅 (마이크 녹음 + TTS 재생)
 */
export function useAudio() {
  const managerRef = useRef(new AudioManager());
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const startRecording = useCallback((onAudioChunk) => {
    managerRef.current.startRecording(onAudioChunk);
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    managerRef.current.stopRecording();
    setIsRecording(false);
  }, []);

  const playTTS = useCallback(async (base64Data, sampleRate) => {
    setIsPlaying(true);
    try {
      await managerRef.current.playAudio(base64Data, sampleRate);
    } finally {
      setIsPlaying(false);
    }
  }, []);

  return { isRecording, isPlaying, startRecording, stopRecording, playTTS };
}

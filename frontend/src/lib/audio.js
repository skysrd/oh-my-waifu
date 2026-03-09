/**
 * 오디오 유틸리티 (STT 마이크 캡처 + TTS 재생)
 */

export class AudioManager {
  constructor() {
    this.mediaStream = null;
    this.audioContext = null;
    this.processor = null;
    this.isRecording = false;
    this._onAudioChunk = null;
  }

  async startRecording(onAudioChunk) {
    this._onAudioChunk = onAudioChunk;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true },
    });

    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // ScriptProcessor로 PCM 데이터 추출
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.isRecording = true;

    // VAD: 볼륨 기반
    let silenceStart = Date.now();
    let speechDetected = false;
    const chunks = [];
    const SILENCE_THRESHOLD = 0.01;
    const SILENCE_DURATION = 1500; // 1.5초 무음이면 전송

    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;

      const input = e.inputBuffer.getChannelData(0);
      const volume = Math.sqrt(input.reduce((sum, v) => sum + v * v, 0) / input.length);

      if (volume > SILENCE_THRESHOLD) {
        speechDetected = true;
        silenceStart = Date.now();
      }

      if (speechDetected) {
        // Float32 → Int16 PCM 변환
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          pcm[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
        }
        chunks.push(pcm);

        // 무음 감지 → 오디오 전송
        if (Date.now() - silenceStart > SILENCE_DURATION) {
          const totalLength = chunks.reduce((s, c) => s + c.length, 0);
          const combined = new Int16Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          chunks.length = 0;
          speechDetected = false;

          // WAV로 인코딩하여 전송
          const wav = this._encodeWav(combined, 16000);
          const base64 = this._arrayBufferToBase64(wav);
          this._onAudioChunk?.(base64);
        }
      }
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stopRecording() {
    this.isRecording = false;
    this.processor?.disconnect();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.audioContext?.close();
  }

  playAudio(base64Data, sampleRate = 24000) {
    return new Promise((resolve) => {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const ctx = new AudioContext();
      ctx.decodeAudioData(bytes.buffer, (buffer) => {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => {
          ctx.close();
          resolve();
        };
        source.start();
      });
    });
  }

  _encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);

    for (let i = 0; i < samples.length; i++) {
      view.setInt16(44 + i * 2, samples[i], true);
    }

    return buffer;
  }

  _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

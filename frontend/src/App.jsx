import { useState, useRef, useEffect, useCallback } from "react";
import AvatarCanvas from "./components/AvatarCanvas";
import { useWebSocket } from "./hooks/useWebSocket";
import { useAudio } from "./hooks/useAudio";
import { useLipsync } from "./hooks/useLipsync";
import "./App.css";

function App() {
  const [input, setInput] = useState("");
  const avatarRef = useRef(null);
  const chatEndRef = useRef(null);

  const {
    connected,
    messages,
    currentResponse,
    ttsAudio,
    lipsyncData,
    emotion,
    conversationState,
    sendChat,
    sendAudio,
    setTtsAudio,
    setLipsyncData,
  } = useWebSocket();

  const { isRecording, isPlaying, startRecording, stopRecording, playTTS } =
    useAudio();
  const { applyLipsync, stopLipsync } = useLipsync(avatarRef);

  // 감정 + 대화 상태를 아바타에 전달
  useEffect(() => {
    const avatar = avatarRef.current;
    if (!avatar) return;
    avatar.setEmotion(emotion);
  }, [emotion]);

  useEffect(() => {
    const avatar = avatarRef.current;
    if (!avatar) return;
    avatar.setConversationState(conversationState);
  }, [conversationState]);

  // TTS 오디오 수신 시 재생
  useEffect(() => {
    if (ttsAudio && lipsyncData) {
      playTTS(ttsAudio.data, ttsAudio.sample_rate);
      applyLipsync(lipsyncData, ttsAudio.duration);
      setTtsAudio(null);
      setLipsyncData(null);
    }
  }, [ttsAudio, lipsyncData, playTTS, applyLipsync, setTtsAudio, setLipsyncData]);

  // 재생 완료 시 lipsync 정지
  useEffect(() => {
    if (!isPlaying) {
      stopLipsync();
    }
  }, [isPlaying, stopLipsync]);

  // 채팅 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentResponse]);

  const handleSend = useCallback(() => {
    if (input.trim()) {
      sendChat(input.trim());
      setInput("");
    }
  }, [input, sendChat]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(sendAudio);
    }
  }, [isRecording, startRecording, stopRecording, sendAudio]);

  return (
    <div className="app">
      <div className="avatar-panel">
        <AvatarCanvas avatarRef={avatarRef} vrmPath="/models/avatar.vrm" />
        <div className="status-bar">
          <span className={`status-dot ${connected ? "online" : "offline"}`} />
          <span>{connected ? "연결됨" : "연결 끊김"}</span>
          {isPlaying && <span className="speaking">🔊 말하는 중...</span>}
        </div>
      </div>

      <div className="chat-panel">
        <div className="messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <span className="label">
                {msg.role === "user" ? "나" : "AI"}
              </span>
              <p>{msg.content}</p>
            </div>
          ))}
          {currentResponse && (
            <div className="message assistant">
              <span className="label">AI</span>
              <p>{currentResponse}</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="input-area">
          <button
            className={`mic-btn ${isRecording ? "recording" : ""}`}
            onClick={toggleRecording}
            title={isRecording ? "녹음 중지" : "음성 입력"}
          >
            🎤
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            rows={1}
          />
          <button className="send-btn" onClick={handleSend} disabled={!input.trim()}>
            전송
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

import { useRef, useCallback, useEffect, useState } from "react";
import { WebSocketClient } from "../lib/ws";

/**
 * WebSocket 연결 관리 훅
 */
export function useWebSocket() {
  const clientRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [ttsAudio, setTtsAudio] = useState(null);
  const [lipsyncData, setLipsyncData] = useState(null);
  const [sttResult, setSttResult] = useState(null);

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case "chat_response":
        if (data.done) {
          setMessages((prev) => [...prev, { role: "assistant", content: currentResponse }]);
          setCurrentResponse("");
        } else {
          setCurrentResponse((prev) => prev + data.text);
        }
        break;
      case "tts_audio":
        setTtsAudio(data);
        break;
      case "lipsync":
        setLipsyncData(data.data);
        break;
      case "stt_result":
        setSttResult(data.text);
        setMessages((prev) => [...prev, { role: "user", content: data.text }]);
        break;
      case "error":
        console.error("서버 오류:", data.message);
        break;
    }
  }, [currentResponse]);

  useEffect(() => {
    const client = new WebSocketClient(handleMessage);
    clientRef.current = client;
    client.connect();

    const checkConnection = setInterval(() => {
      setConnected(client.ws?.readyState === WebSocket.OPEN);
    }, 1000);

    return () => {
      clearInterval(checkConnection);
      client.disconnect();
    };
  }, [handleMessage]);

  const sendChat = useCallback((message) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    clientRef.current?.sendChat(message);
  }, []);

  const sendAudio = useCallback((base64Data) => {
    clientRef.current?.sendAudio(base64Data);
  }, []);

  return {
    connected,
    messages,
    currentResponse,
    ttsAudio,
    lipsyncData,
    sttResult,
    sendChat,
    sendAudio,
    setTtsAudio,
    setLipsyncData,
  };
}

/**
 * WebSocket 클라이언트
 */

const WS_URL = `ws://${window.location.host}/ws`;

export class WebSocketClient {
  constructor(onMessage) {
    this.onMessage = onMessage;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log("WebSocket 연결됨");
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage(data);
      } catch (e) {
        console.error("WebSocket 메시지 파싱 오류:", e);
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket 연결 해제");
      this._tryReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket 오류:", error);
    };
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket이 연결되지 않음");
    }
  }

  sendChat(message) {
    this.send({ type: "chat", message });
  }

  sendAudio(base64Data) {
    this.send({ type: "audio", data: base64Data });
  }

  disconnect() {
    this.maxReconnectAttempts = 0;
    this.ws?.close();
  }

  _tryReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      console.log(`재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts} (${delay}ms 후)`);
      setTimeout(() => this.connect(), delay);
    }
  }
}

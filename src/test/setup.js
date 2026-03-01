import '@testing-library/jest-dom'

class FileWebSocket {
  static instances = []
  static pendingMessages = []
  static messageCallbacks = []
  
  constructor(url) {
    this.url = url
    FileWebSocket.instances.push(this)
    
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      if (this.onOpenHandler) this.onOpenHandler()
      this.processPendingMessages()
    }, 10)
  }

  send(data) {}
  
  close() {
    this.readyState = WebSocket.CLOSED
    if (this.onCloseHandler) this.onCloseHandler()
  }

  onopen(fn) { this.onOpenHandler = fn }
  onmessage(fn) { this.onMessageHandler = fn }
  onclose(fn) { this.onCloseHandler = fn }
  onerror(fn) {}

  processPendingMessages() {
    FileWebSocket.pendingMessages.forEach((msg, idx) => {
      if (this.onMessageHandler) {
        const data = JSON.parse(msg)
        FileWebSocket.messageCallbacks.forEach(cb => cb(idx + 1, data))
        this.onMessageHandler(new MessageEvent('message', { data }))
      }
    })
  }

  static reset() {
    FileWebSocket.instances = []
    FileWebSocket.pendingMessages = []
    FileWebSocket.messageCallbacks = []
  }

  static setPendingMessages(messages) {
    FileWebSocket.pendingMessages = messages
  }

  static onMessageSent(fn) {
    FileWebSocket.messageCallbacks.push(fn)
  }
}

global.WebSocket = FileWebSocket

export { FileWebSocket }
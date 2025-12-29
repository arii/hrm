
import { getWebSocketURL } from '../utils/urls'
import { ClientCommandMessage, ServerMessage } from '../types/websocket'

type MessageListener = (message: ServerMessage) => void
type StatusListener = (status: string) => void

export class WebSocketManager {
  private static instance: WebSocketManager
  private ws: WebSocket | null = null
  private messageListeners = new Set<MessageListener>()
  private statusListeners = new Set<StatusListener>()
  private connectionStatus = 'Not Connected'
  private reconnectTimeout: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private shouldReconnect = true
  private wsUrl: string | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private pongTimeout: NodeJS.Timeout | null = null
  private pendingActions: ClientCommandMessage[] = []

  private constructor() {
    // Constructor is now intentionally left blank
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  public initialize(serverUrl?: string) {
    const newUrl = serverUrl || getWebSocketURL()
    if (this.wsUrl === newUrl) {
      return; // Already initialized with the same URL
    }

    if (this.ws) {
      this.disconnect()
    }

    if (typeof window !== 'undefined') {
      const savedActions = localStorage.getItem('pendingActions')
      if (savedActions) {
        this.pendingActions = JSON.parse(savedActions)
      }
    }
    let clientId: string | null = null
    if (typeof window !== 'undefined') {
      try {
        clientId = localStorage.getItem('clientId')
        if (!clientId) {
          clientId = window.crypto.randomUUID()
          localStorage.setItem('clientId', clientId)
        }
      } catch (error) {
        console.error('Failed to access localStorage:', error)
        clientId = window.crypto.randomUUID() // Fallback
      }
    }

    const baseUrl = newUrl
    try {
      const url = new URL(baseUrl)
      if (clientId) {
        url.searchParams.set('clientId', clientId)
      }
      this.wsUrl = url.toString()
    } catch (error) {
      console.error('Invalid WebSocket URL:', baseUrl)
      this.wsUrl = null
    }

    this.connect()
  }


  // This method is purely for testing purposes to reset the singleton instance
  public static __resetForTest() {
    WebSocketManager.instance = null!
  }

  public connect() {
    if (!this.wsUrl) {
        console.error("WebSocketManager not initialized. Call initialize() first.");
        return;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return
    }

    this.shouldReconnect = true
    this.ws = new WebSocket(this.wsUrl)

    this.ws.onopen = () => {
      this.updateStatus('Connected')
      if (typeof window !== 'undefined') {
        ;(window as any).__TEST_WEBSOCKET_READY__ = true
      }
      this.reconnectAttempts = 0
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }
      this.ws?.send(JSON.stringify({ type: 'GET_STATE' }))
      this.sendPendingActions()
      this.startHeartbeat()
    }

    this.ws.onclose = () => {
      this.updateStatus('Disconnected')
      if (typeof window !== 'undefined') {
        ;(window as any).__TEST_WEBSOCKET_READY__ = false
      }
      this.stopHeartbeat()
      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      this.updateStatus('Error')
    }

    this.ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data)
        if (message.type === 'PONG') {
          if (this.pongTimeout) {
            clearTimeout(this.pongTimeout)
          }
          return
        }
        this.messageListeners.forEach((listener) => listener(message))
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }
  }

  public disconnect() {
    this.shouldReconnect = false
    this.stopHeartbeat()
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    this.ws?.close()
  }

  public sendData(data: ClientCommandMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket not open, queueing action.', data)
      this.pendingActions.push(data)
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingActions', JSON.stringify(this.pendingActions))
      }
    }
  }

  public addMessageListener(listener: MessageListener) {
    this.messageListeners.add(listener)
  }

  public removeMessageListener(listener: MessageListener) {
    this.messageListeners.delete(listener)
  }

  public addStatusListener(listener: StatusListener) {
    this.statusListeners.add(listener)
  }

  public removeStatusListener(listener: StatusListener) {
    this.statusListeners.delete(listener)
  }

  public getConnectionStatus(): string {
    return this.connectionStatus
  }

  private updateStatus(status: string) {
    this.connectionStatus = status
    this.statusListeners.forEach((listener) => listener(status))
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts > 10) {
      this.updateStatus('Failed to connect')
      return
    }

    this.reconnectAttempts++
    const delay = 1000 * 2 ** (this.reconnectAttempts - 1)
    const jitter = delay * 0.2 * (Math.random() - 0.5)
    this.reconnectTimeout = setTimeout(() => {
      this.updateStatus('Reconnecting...')
      this.connect()
    }, delay + jitter)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }))
        this.pongTimeout = setTimeout(() => {
          this.ws?.close()
        }, 15000)
      }
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout)
    }
  }

  private sendPendingActions() {
    if (this.pendingActions.length > 0) {
      this.pendingActions.forEach((action) => {
        this.sendData(action)
      })
      this.pendingActions = []
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingActions', '[]')
      }
    }
  }
}

export default WebSocketManager.getInstance()

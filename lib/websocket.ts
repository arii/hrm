import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { Socket } from 'net'
import { parse } from 'url'
import { ServerMessage } from '../types/websocket.js'
import { IWebSocket } from '../types/ws.js'

export class WebSocketManager {
  public wss: WebSocketServer
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor() {
    this.wss = new WebSocketServer({ noServer: true })

    this.wss.on('connection', (ws: IWebSocket) => {
      ws.isAlive = true
      ws.on('pong', () => {
        ws.isAlive = true
      })
    })
  }

  public startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((client) => {
        const ws = client as IWebSocket
        if (!ws.isAlive) {
          return ws.terminate()
        }
        ws.isAlive = false
        ws.ping(() => {})
      })
    }, 60000)
  }

  public stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
  }

  public handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
    const { pathname } = parse(req.url || '')
    if (pathname === '/ws') {
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.wss.emit('connection', ws as IWebSocket, req)
      })
    }
  }

  public createBroadcaster() {
    return (data: Partial<ServerMessage>) => {
      if (this.wss.clients.size > 0) {
        const message = JSON.stringify({
          ...data,
        })
        this.wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message)
          }
        })
      }
    }
  }
}

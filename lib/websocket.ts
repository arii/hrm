import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { Socket } from 'net'
import { ServerMessage } from '../types/websocket.js'

export class WebSocketManager {
  public wss: WebSocketServer

  constructor() {
    this.wss = new WebSocketServer({ noServer: true })
  }

  public handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
    const _ws_url = new URL(req.url || '', `http://${req.headers.host}`)
    const { pathname } = _ws_url
    if (pathname === '/ws') {
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.wss.emit('connection', ws, req)
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

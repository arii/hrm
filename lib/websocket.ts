import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { Socket } from 'net'
import { parse } from 'url'
import { ServerMessage } from '../types/websocket.js'

export class WebSocketManager {
  public wss: WebSocketServer

  constructor() {
    this.wss = new WebSocketServer({
      noServer: true,
      verifyClient: (info, cb) => {
        // In a production environment, you'd want a more robust origin check
        // that validates against a list of allowed origins.
        // For this application, allowing localhost is sufficient for testing.
        const allowedOrigins = [
          'http://127.0.0.1:3000',
          'http://localhost:3000',
        ]
        if (info.origin && !allowedOrigins.includes(info.origin)) {
          return cb(false, 401, 'Unauthorized')
        }
        cb(true)
      },
    })
  }

  public handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
    const { pathname } = parse(req.url || '')
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

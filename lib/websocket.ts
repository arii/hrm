import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { Socket } from 'net'
import { parse } from 'url'
import { ServerMessage } from '../types/websocket'
import logger from '../utils/logger.js'

export class WebSocketManager {
  public wss: WebSocketServer

  constructor() {
    this.wss = new WebSocketServer({ noServer: true })
  }

  public handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
    const { pathname } = parse(req.url || '')
    if (pathname === '/ws') {
      try {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req)
        })
      } catch (error) {
        logger.error({ err: error }, 'Error during WebSocket upgrade')
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n')
        socket.destroy()
      }
    }
  }

  public createBroadcaster() {
    return (data: ServerMessage) => {
      if (this.wss.clients.size > 0) {
        const message = JSON.stringify(data)
        this.wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message)
          }
        })
      }
    }
  }
}

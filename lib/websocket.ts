import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { Socket } from 'net'
import { parse } from 'url'
import { ServerMessage } from '../types/websocket.js'
import { getBasePath } from '../utils/urls.js'

/**
 * True when a request URL targets the app websocket: /ws at root, or the
 * subpath-prefixed upgrade (proxied, no-strip) when basePath is configured.
 * Anything else (notably Next's /_next/webpack-hmr) is not ours to count.
 */
export const isAppWsUpgrade = (url?: string): boolean => {
  const { pathname } = parse(url || '')
  const basePath = getBasePath()
  const normalized =
    basePath && pathname?.startsWith(`${basePath}/`)
      ? pathname.slice(basePath.length)
      : pathname
  return normalized === '/ws'
}

/**
 * Per-IP budget for app websocket upgrades. Tracks live sockets (not a bare
 * counter) so half-closed sockets that never emit 'close' cannot leak the
 * budget: destroyed sockets are swept on every check.
 */
export const createWsConnectionLimiter = (max: number) => {
  const connections = new Map<string, Set<Socket>>()

  return {
    checkAndTrack: (ip: string, socket: Socket): boolean => {
      let sockets = connections.get(ip)
      if (!sockets) {
        sockets = new Set()
        connections.set(ip, sockets)
      }
      for (const tracked of sockets) {
        if (tracked.destroyed) sockets.delete(tracked)
      }
      if (sockets.size >= max) return false
      sockets.add(socket)
      socket.on('close', () => {
        connections.get(ip)?.delete(socket)
      })
      return true
    },
  }
}

export class WebSocketManager {
  public wss: WebSocketServer

  constructor() {
    this.wss = new WebSocketServer({ noServer: true })
  }

  public handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
    if (isAppWsUpgrade(req.url)) {
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

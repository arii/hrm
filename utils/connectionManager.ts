
import { WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { ExtWebSocket } from '../types/websocket'
import logger from './logger'

export class ConnectionManager {
  private clientSockets = new Map<string, WebSocket>()

  constructor() {}

  addConnection(ws: ExtWebSocket, req: IncomingMessage) {
    const params = this.getRequestParams(req)
    const clientId = params.get('clientId') || this.generateClientId()
    ws.clientId = clientId

    if (this.clientSockets.has(clientId)) {
      logger.warn({ clientId }, 'Existing socket found. Overwriting with new connection.')
    }

    this.clientSockets.set(clientId, ws)
    return clientId
  }

  removeConnection(clientId: string) {
    this.clientSockets.delete(clientId)
  }

  getClientSocket(clientId: string) {
    return this.clientSockets.get(clientId)
  }

  private getRequestParams(req: IncomingMessage): URLSearchParams {
    try {
      const host = req.headers.host || 'localhost'
      const protocol = 'http'
      const url = new URL(req.url || '/', `${protocol}://${host}`)
      return url.searchParams
    } catch (error) {
      logger.error({ error }, 'Failed to parse WebSocket connection URL')
      return new URLSearchParams()
    }
  }

  private generateClientId(): string {
    return `[GENERATED]-user-${Math.random().toString(36).substring(2, 9)}`
  }
}

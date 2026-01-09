// File: utils/disconnectedClientManager.ts (New)
import { WebSocket } from 'ws'
import { ExtWebSocket } from '../types/websocket'
import { HrmDataRepository } from '../lib/repositories/HrmDataRepository'
import logger from './logger'
import { env } from '../lib/env'

type ClientId = string
type SessionCleanupCallback = (clientId: ClientId) => void

export class DisconnectedClientManager {
  private disconnectedClients = new Map<ClientId, { timestamp: number }>()
  private clientSockets: Map<string, WebSocket>
  private hrmDataRepository: HrmDataRepository
  private cleanupCallback: SessionCleanupCallback
  private checkInterval: NodeJS.Timeout

  constructor(
    clientSockets: Map<string, WebSocket>,
    hrmDataRepository: HrmDataRepository,
    cleanupCallback: SessionCleanupCallback
  ) {
    this.clientSockets = clientSockets
    this.hrmDataRepository = hrmDataRepository
    this.cleanupCallback = cleanupCallback
    this.checkInterval = setInterval(
      this.checkDisconnectedClients.bind(this),
      env.WEBSOCKET_GRACE_PERIOD_MS
    )
  }

  public add(clientId: ClientId) {
    this.disconnectedClients.set(clientId, { timestamp: Date.now() })
    logger.info({ clientId }, 'Client added to disconnected manager.')
  }

  private checkDisconnectedClients() {
    const now = Date.now()
    for (const [clientId, data] of this.disconnectedClients.entries()) {
      if (now - data.timestamp > env.WEBSOCKET_GRACE_PERIOD_MS) {
        // Check if the client has reconnected
        if (!this.clientSockets.has(clientId)) {
          this.cleanupCallback(clientId)
        }
        this.disconnectedClients.delete(clientId)
      }
    }
  }

  public stop() {
    clearInterval(this.checkInterval)
  }
}

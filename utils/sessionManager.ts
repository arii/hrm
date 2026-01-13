import { HrmDataRepository } from '../lib/repositories/HrmDataRepository'
import logger from './logger'

interface DisconnectedClient {
  clientId: string
  timestamp: number
}

export class SessionManager {
  private disconnectedClients = new Map<string, DisconnectedClient>()
  private cleanupInterval: NodeJS.Timeout | null = null
  private broadcastState: () => void

  constructor(
    private hrmDataRepository: HrmDataRepository,
    private gracePeriodMs: number,
    broadcastState: () => void
  ) {
    this.broadcastState = broadcastState
  }

  start() {
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredSessions(),
      this.gracePeriodMs
    )
    logger.info('SessionManager started.')
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    logger.info('SessionManager stopped.')
  }

  markAsDisconnected(clientId: string) {
    this.disconnectedClients.set(clientId, {
      clientId,
      timestamp: Date.now(),
    })
    logger.info({ clientId }, 'Client marked as disconnected.')
  }

  reconnected(clientId: string) {
    if (this.disconnectedClients.has(clientId)) {
      this.disconnectedClients.delete(clientId)
      logger.info({ clientId }, 'Disconnected client reconnected.')
    }
  }

  private cleanupExpiredSessions() {
    const now = Date.now()
    for (const [
      clientId,
      disconnectedClient,
    ] of this.disconnectedClients.entries()) {
      if (now - disconnectedClient.timestamp > this.gracePeriodMs) {
        logger.info({ clientId }, 'Session expired. Deleting data.')
        try {
          this.hrmDataRepository.deleteById(clientId)
          // Here we would also delete other session data
          this.broadcastState()
        } catch (err) {
          logger.error({ clientId, error: err }, 'Error during session cleanup')
        } finally {
          this.disconnectedClients.delete(clientId)
        }
      }
    }
  }
}

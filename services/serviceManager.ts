// services/serviceManager.ts
import { IWebSocketService } from '../types/service'
import { ServerMessage } from '../types/websocket'
import { SpotifyPolling } from './spotifyPolling'
import TimerService from './tabataTimer'
import logger from '../utils/logger'

export class ServiceManager {
  private services: Map<string, IWebSocketService> = new Map()

  constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.services.set(
      'spotify',
      new SpotifyPolling(broadcastUpdate)
    )
    this.services.set('timer', new TimerService(broadcastUpdate))
  }

  public async init() {
    for (const [name, service] of this.services) {
      try {
        await service.init()
        logger.debug(`Service ${name} initialized.`)
      } catch (error) {
        logger.error(`Failed to initialize service ${name}:`, error)
      }
    }
  }

  public getServices(): Map<string, IWebSocketService> {
    return this.services
  }

  public stop() {
    for (const [name, service] of this.services) {
      try {
        service.stop()
        logger.debug(`Service ${name} stopped.`)
      } catch (error) {
        logger.error(`Failed to stop service ${name}:`, error)
      }
    }
  }
}

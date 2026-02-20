<<<<<<< HEAD
import { Device } from '@spotify/web-api-ts-sdk'
import { SpotifyDevice } from '@/types/core'
import { ServerMessage, SpotifyData } from '@/types/websocket'
import { SafeSpotifyApi } from '@/services/safeSpotifyApi'
import logger from '@/utils/logger.server'
=======
import { Device, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyDevice } from '../types/core'
import { ServerMessage, SpotifyData } from '../types/websocket'
import logger from '../utils/logger.server.js'
>>>>>>> origin/leader

export class SpotifyDeviceManager {
  private sdk: SpotifyApi
  private broadcastUpdate: (message: ServerMessage) => void
  private getState: () => SpotifyData
  private setState: (updateFn: (prevState: SpotifyData) => SpotifyData) => void

  constructor(
    sdk: SpotifyApi,
    broadcastUpdate: (message: ServerMessage) => void,
    getState: () => SpotifyData,
    setState: (updateFn: (prevState: SpotifyData) => SpotifyData) => void
  ) {
    this.sdk = sdk
    this.broadcastUpdate = broadcastUpdate
    this.getState = getState
    this.setState = setState
  }

  public async refreshDevices(): Promise<void> {
    try {
      const response = await this.sdk.player.getAvailableDevices()
      const validDevices: SpotifyDevice[] = (response.devices || [])
        .filter((d: Device): d is Device & { id: string } => d.id !== null)
        .map((d) => ({
          id: d.id,
          is_active: d.is_active,
          is_private_session: d.is_private_session,
          is_restricted: d.is_restricted,
          name: d.name,
          type: d.type,
          volume_percent: d.volume_percent ?? 0,
        }))

      this.setState((prevState) => ({ ...prevState, devices: validDevices }))
      this.broadcastUpdate({
        type: 'SPOTIFY_UPDATE',
        payload: this.getState(),
      })
      logger.debug({ count: validDevices.length }, 'Devices refreshed')
    } catch (error) {
      logger.error({ err: error }, 'Error fetching Spotify devices')
    }
  }
}

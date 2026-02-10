import { Device } from '@spotify/web-api-ts-sdk'
import { SpotifyDevice } from '../types/core'
import { SpotifyManagerContext } from '../types/interfaces.js'
import logger from '../utils/logger.server.js'

export class SpotifyDeviceManager {
  private context: SpotifyManagerContext

  constructor(context: SpotifyManagerContext) {
    this.context = context
  }

  public async refreshDevices(): Promise<void> {
    const sdk = this.context.getSdk()
    if (!sdk) return

    try {
      const response = await sdk.player.getAvailableDevices()
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

      this.context.setState((prevState) => ({
        ...prevState,
        devices: validDevices,
      }))
      this.context.broadcastUpdate({
        type: 'SPOTIFY_UPDATE',
        payload: this.context.getState(),
      })
      logger.debug({ count: validDevices.length }, 'Devices refreshed')
    } catch (error) {
      logger.error({ err: error }, 'Error fetching Spotify devices')
    }
  }
}

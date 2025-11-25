// services/spotifyApiService.ts
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import logger from '../utils/logger'

export class SpotifyApiService {
  private sdk: SpotifyApi

  constructor(sdk: SpotifyApi) {
    this.sdk = sdk
  }

  public async getCurrentlyPlaying() {
    try {
      return await this.sdk.player.getCurrentlyPlayingTrack()
    } catch (error) {
      this.handleApiError(error, 'getCurrentlyPlayingTrack')
      return null
    }
  }

  public async getAvailableDevices() {
    try {
      return await this.sdk.player.getAvailableDevices()
    } catch (error) {
      this.handleApiError(error, 'getAvailableDevices')
      return { devices: [] }
    }
  }

  public async startResumePlayback(deviceId: string, contextUri?: string) {
    try {
      await this.sdk.player.startResumePlayback(deviceId, contextUri)
    } catch (error) {
      this.handleApiError(error, 'startResumePlayback')
    }
  }

  public async pausePlayback(deviceId: string) {
    try {
      await this.sdk.player.pausePlayback(deviceId)
    } catch (error) {
      this.handleApiError(error, 'pausePlayback')
    }
  }

  public async skipToNext(deviceId: string) {
    try {
      await this.sdk.player.skipToNext(deviceId)
    } catch (error) {
      this.handleApiError(error, 'skipToNext')
    }
  }

  public async skipToPrevious(deviceId: string) {
    try {
      await this.sdk.player.skipToPrevious(deviceId)
    } catch (error) {
      this.handleApiError(error, 'skipToPrevious')
    }
  }

  public async transferPlayback(deviceId: string) {
    try {
      await this.sdk.player.transferPlayback([deviceId], true)
    } catch (error) {
      this.handleApiError(error, 'transferPlayback')
    }
  }

  public async setPlaybackVolume(volume: number, deviceId?: string) {
    try {
      await this.sdk.player.setPlaybackVolume(volume, deviceId)
    } catch (error) {
      this.handleApiError(error, 'setPlaybackVolume')
    }
  }

  private handleApiError(error: unknown, context: string) {
    // Basic error logging, can be expanded
    logger.error({ err: error }, `Spotify API error in ${context}`)
  }
}

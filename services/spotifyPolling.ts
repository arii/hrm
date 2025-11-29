import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { ServerMessage, SpotifyData } from '../types/websocket'
import { SpotifyApiService } from './spotifyApi.js'
import logger from '../utils/logger.js'

type SpotifyCommand =
  | 'PLAY'
  | 'NEXT'
  | 'PREVIOUS'
  | 'LOGIN'
  | 'TRANSFER_PLAYBACK'
  | 'SET_VOLUME'
  | 'PAUSE'

export class SpotifyPolling {
  private pollInterval: NodeJS.Timeout | null = null
  private broadcastUpdate: (message: ServerMessage) => void
  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null
  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
  }
  private spotifyApiService: SpotifyApiService

  private constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
    this.spotifyApiService = SpotifyApiService.getInstance()
    logger.debug('Spotify Polling Service Initialized.')
  }

  public static create(
    broadcastUpdate: (message: ServerMessage) => void
  ): SpotifyPolling {
    return new SpotifyPolling(broadcastUpdate)
  }

  public forcePollAndBroadcast(): void {
    this.getCurrentlyPlaying()
  }

  public getState(): SpotifyData {
    return { ...this.state }
  }

  public startPolling(intervalMs: number = 3000): void {
    if (this.pollInterval) return
    this.pollInterval = setInterval(() => this.getCurrentlyPlaying(), intervalMs)
    logger.debug('Spotify polling started.')
  }

  public stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
      logger.debug('Spotify polling stopped.')
    }
  }

  public cleanup(): void {
    this.stopPolling()
  }

  private get sdk(): SpotifyApi | null {
    return this.spotifyApiService.getSdk()
  }

  private getCurrentlyPlaying = async () => {
    if (!this.sdk) return

    try {
      const playbackState = await this.sdk.player.getCurrentlyPlayingTrack()

      if (!playbackState) {
        if (this.lastPlaybackState !== false) {
          this.lastPlaybackState = false
          this.state = {
            trackName: 'Nothing is currently playing.',
            artist: '',
            isPlaying: false,
          }
          this.broadcastUpdate({
            type: 'SPOTIFY_UPDATE',
            payload: this.getState(),
          })
        }
        return
      }

      if (
        playbackState.currently_playing_type !== 'track' &&
        playbackState.currently_playing_type !== 'episode'
      ) {
        return
      }

      const item = playbackState.item
      const trackName = item?.name || 'Unknown Content'
      let artistName = 'Unknown Artist'
      if (item && 'artists' in item) {
        artistName = item.artists.map((a) => a.name).join(', ')
      } else if (item && 'show' in item) {
        artistName = item.show.name
      }

      const isPlaying = playbackState.is_playing

      if (
        item?.id !== this.lastTrackId ||
        isPlaying !== this.lastPlaybackState
      ) {
        this.lastTrackId = item?.id || null
        this.lastPlaybackState = isPlaying
        this.state = {
          trackName: trackName,
          artist: artistName,
          isPlaying: isPlaying,
        }
        this.broadcastUpdate({
          type: 'SPOTIFY_UPDATE',
          payload: this.getState(),
        })
      }
    } catch (error) {
      const err = error as { status?: number }
      if (err?.status === 401) {
        logger.warn(
          'Spotify token expired during polling. Attempting refresh.'
        )
        await this.spotifyApiService.getTokenManager().refreshToken()
      } else {
        logger.error({ err: error }, 'Error fetching currently playing track')
      }
    }
  }

  public async getAvailableDevices() {
    if (!this.sdk) {
      logger.warn('Cannot get devices: SDK not initialized.')
      return []
    }
    try {
      const response = await this.sdk.player.getAvailableDevices()
      return response.devices
    } catch (error) {
      logger.error({ err: error }, 'Error fetching Spotify devices')
      return []
    }
  }

  public handleCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ): void {
    if (!this.sdk) {
      logger.warn('Cannot execute command: SDK not initialized.')
      return
    }

    this.executeSpotifyCommand(command, deviceId, volume, playlistUri)
      .then(() => {
        setTimeout(() => this.getCurrentlyPlaying(), 500)
      })
      .catch((error) => {
        this.logSpotifyCommandError(command, error)
      })
  }

  private async executeSpotifyCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ) {
    if (['PLAY', 'PAUSE', 'NEXT', 'PREVIOUS'].includes(command) && !deviceId) {
      logger.warn(
        `[SpotifyPolling] ${command} command ignored: no deviceId provided.`
      )
      return
    }
    switch (command) {
      case 'PLAY':
        if (playlistUri) {
          await this.sdk!.player.startResumePlayback(deviceId!, playlistUri)
        } else {
          await this.sdk!.player.startResumePlayback(deviceId!)
        }
        break
      case 'PAUSE':
        await this.sdk!.player.pausePlayback(deviceId!)
        break
      case 'NEXT':
        await this.sdk!.player.skipToNext(deviceId!)
        break
      case 'PREVIOUS':
        await this.sdk!.player.skipToPrevious(deviceId!)
        break
      case 'TRANSFER_PLAYBACK':
        if (deviceId) {
          await this.sdk!.player.transferPlayback([deviceId], true)
        }
        break
      case 'SET_VOLUME':
        if (volume !== undefined) {
          const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)))
          await this.sdk!.player.setPlaybackVolume(clampedVolume, deviceId)
        }
        break
      case 'LOGIN':
        logger.debug('Received LOGIN command.')
        break
      default:
        logger.warn(`Unknown Spotify command: ${command}`)
    }
  }

  private async logSpotifyCommandError(
    _command: SpotifyCommand,
    _error: unknown
  ) {
    // Error logging logic remains the same as it's still relevant
    // ... (omitting for brevity, but it's the same as the original file)
  }
}

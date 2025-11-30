import { ServerMessage, SpotifyData } from '../types/websocket'
import logger from '../utils/logger'
import { SpotifyClient } from './spotify/spotifyClient'
import { SpotifyApi, Track } from '@spotify/web-api-ts-sdk'

type SpotifyCommand =
  | 'PLAY'
  | 'NEXT'
  | 'PREVIOUS'
  | 'LOGIN'
  | 'TRANSFER_PLAYBACK'
  | 'SET_VOLUME'
  | 'PAUSE'

function isTrack(item: any): item is Track {
  return item && item.type === 'track'
}

/**
 * A service that polls the Spotify API for the currently playing track
 * and handles playback commands. It uses the centralized SpotifyClient
 * for all API interactions.
 */
export class SpotifyPolling {
  private broadcastUpdate: (message: ServerMessage) => void
  private spotifyClient: SpotifyClient
  private pollInterval: NodeJS.Timeout | null = null
  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null
  private isPolling = false

  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
  }

  constructor(
    broadcastUpdate: (message: ServerMessage) => void,
    spotifyClient: SpotifyClient
  ) {
    this.broadcastUpdate = broadcastUpdate
    this.spotifyClient = spotifyClient
    logger.debug('Spotify Polling Service Initialized.')
  }

  public startPolling(intervalMs: number = 3000): void {
    if (this.isPolling) return
    this.isPolling = true
    this.pollInterval = setInterval(() => this.getCurrentlyPlaying(), intervalMs)
    logger.info('Spotify polling started.')
    this.getCurrentlyPlaying()
  }

  public stopPolling(): void {
    if (!this.isPolling) return
    this.isPolling = false
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    logger.info('Spotify polling stopped.')
  }

  public cleanup(): void {
    this.stopPolling()
  }

  public forcePollAndBroadcast(): void {
    this.getCurrentlyPlaying()
  }

  public getState(): SpotifyData {
    return { ...this.state }
  }

  private async getCurrentlyPlaying(): Promise<void> {
    try {
      const sdk = await this.spotifyClient.getSdk()
      const playbackState = await sdk.player.getCurrentlyPlayingTrack()

      if (!playbackState || !playbackState.item) {
        if (this.lastPlaybackState !== false) {
          this.lastPlaybackState = false
          this.state = {
            trackName: 'No Active Playback',
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

      const item = playbackState.item
      let trackName = 'Unknown Title'
      let artistName = 'Unknown Artist'

      if (isTrack(item)) {
        trackName = item.name
        artistName = item.artists.map((a) => a.name).join(', ')
      }

      const isPlaying = playbackState.is_playing

      if (
        item?.id !== this.lastTrackId ||
        isPlaying !== this.lastPlaybackState
      ) {
        this.lastTrackId = item?.id || null
        this.lastPlaybackState = isPlaying
        this.state = { trackName, artist: artistName, isPlaying }
        this.broadcastUpdate({
          type: 'SPOTIFY_UPDATE',
          payload: this.getState(),
        })
      }
    } catch (error) {
      if ((error as any)?.status === 401) {
        logger.warn(
          'Spotify token expired during polling. Refresh is being handled by SpotifyClient.'
        )
      } else {
        logger.error({ err: error }, 'Error fetching currently playing track.')
      }
    }
  }

  public async getAvailableDevices() {
    try {
      const sdk = await this.spotifyClient.getSdk()
      const response = await sdk.player.getAvailableDevices()
      return response.devices
    } catch (error) {
      logger.error({ err: error }, 'Error fetching Spotify devices')
      return []
    }
  }

  public async handleCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ): Promise<void> {
    try {
      const sdk = await this.spotifyClient.getSdk()
      await this.executeSpotifyCommand(
        sdk,
        command,
        deviceId,
        volume,
        playlistUri
      )
      setTimeout(() => this.getCurrentlyPlaying(), 500)
    } catch (error) {
      logger.error({ err: error, command }, 'Error executing Spotify command.')
    }
  }

  private async executeSpotifyCommand(
    sdk: SpotifyApi,
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ): Promise<void> {
    const requiresDevice = ['PLAY', 'PAUSE', 'NEXT', 'PREVIOUS']
    if (requiresDevice.includes(command) && !deviceId) {
      logger.warn(`Spotify command '${command}' requires a deviceId.`)
      return
    }

    switch (command) {
      case 'PLAY':
        await sdk.player.startResumePlayback(
          deviceId!,
          playlistUri
        )
        break
      case 'PAUSE':
        await sdk.player.pausePlayback(deviceId!)
        break
      case 'NEXT':
        await sdk.player.skipToNext(deviceId!)
        break
      case 'PREVIOUS':
        await sdk.player.skipToPrevious(deviceId!)
        break
      case 'TRANSFER_PLAYBACK':
        if (deviceId) {
          await sdk.player.transferPlayback([deviceId], true)
        }
        break
      case 'SET_VOLUME':
        if (volume !== undefined) {
          const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)))
          await sdk.player.setPlaybackVolume(clampedVolume, deviceId)
        }
        break
      default:
        logger.warn(`Unknown Spotify command: ${command}`)
    }
  }
}

import { AccessToken, SpotifyApi, Device } from '@spotify/web-api-ts-sdk'
import { ServerMessage, SpotifyData } from '../types/websocket'
import { SpotifyDevice } from '../types/core'
import {
  SpotifyTokenManager,
  SpotifyTokenPayload,
} from './spotifyTokenManager.js'
import logger from '../utils/logger.js'
import {
  handleSpotifyApiError,
  logSpotifyCommandError,
} from './spotifyApiErrorHandling.js'

type SpotifyCommand =
  | 'PLAY'
  | 'NEXT'
  | 'PREVIOUS'
  | 'LOGIN'
  | 'TRANSFER_PLAYBACK'
  | 'SET_VOLUME'
  | 'PAUSE'
  | 'GET_DEVICES'

export class SpotifyPolling {
  private tokenManager: SpotifyTokenManager
  private pollInterval: NodeJS.Timeout | null = null
  private tokenRefreshInterval: NodeJS.Timeout | null = null
  private broadcastUpdate: (message: ServerMessage) => void
  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null
  private sdk: SpotifyApi | null = null

  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
    devices: [],
    volume: 70,
    isMuted: false,
  }

  private constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
    this.tokenManager = new SpotifyTokenManager(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || ''
    )
    logger.debug('Spotify Polling Service Initialized.')
  }

  public static async create(
    broadcastUpdate: (message: ServerMessage) => void
  ): Promise<SpotifyPolling> {
    const instance = new SpotifyPolling(broadcastUpdate)
    await instance.initializeSdk()
    instance.scheduleTokenRefresh()
    return instance
  }

  private async initializeSdk(): Promise<void> {
    const token = await this.tokenManager.getValidAccessToken()
    if (token) {
      const sdkToken = this.tokenManager.getSdkAccessToken()
      if (sdkToken) {
        this.setupSdk(sdkToken)
        logger.debug(
          'Loaded existing Spotify tokens from file. Starting polling.'
        )
        this.startPolling()
      }
    }
  }

  private setupSdk(accessToken: AccessToken): void {
    this.sdk = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID || '',
      accessToken
    )
  }

  private scheduleTokenRefresh(): void {
    if (this.tokenRefreshInterval) clearTimeout(this.tokenRefreshInterval)
    const fiveMinutes = 1000 * 60 * 5
    this.tokenRefreshInterval = setTimeout(async () => {
      await this.checkAndRefreshSdkToken()
      this.scheduleTokenRefresh() // Reschedule the next check
    }, fiveMinutes)
  }

  private async checkAndRefreshSdkToken(): Promise<void> {
    const newTokenString = await this.tokenManager.getValidAccessToken()
    if (newTokenString && this.sdk) {
      const sdkToken = this.tokenManager.getSdkAccessToken()
      if (sdkToken) this.setupSdk(sdkToken)
    }
  }

  public getState(): SpotifyData {
    return { ...this.state }
  }

  public isReady(): boolean {
    return this.sdk !== null
  }

  public async handleTokenUpdate(tokens: SpotifyTokenPayload): Promise<void> {
    logger.debug(
      'Spotify token payload received. Updating SDK and forcing poll.'
    )
    this.tokenManager.updateToken(tokens)
    const sdkToken = this.tokenManager.getSdkAccessToken()
    if (sdkToken) {
      this.setupSdk(sdkToken)
      this.startPolling()
    }
    await this.forcePollAndBroadcast()
  }

  public startPolling(): void {
    if (this.pollInterval) return

    const poll = async () => {
      await this.getCurrentlyPlaying()
      const intervalMs =
        parseInt(process.env.SPOTIFY_POLLING_INTERVAL_MS || '3000', 10)
      this.pollInterval = setTimeout(poll, intervalMs)
    }

    poll() // Start the first poll immediately
    const intervalMs =
      parseInt(process.env.SPOTIFY_POLLING_INTERVAL_MS || '3000', 10)
    logger.debug({ intervalMs }, 'Spotify polling started')
  }

  public stopPolling(): void {
    if (this.pollInterval) {
      clearTimeout(this.pollInterval)
      this.pollInterval = null
      logger.debug('Spotify polling stopped.')
    }
  }

  public cleanup(): void {
    this.stopPolling()
    if (this.tokenRefreshInterval) {
      clearTimeout(this.tokenRefreshInterval)
      this.tokenRefreshInterval = null
      logger.debug('Token refresh interval cleared.')
    }
  }

  private getCurrentlyPlaying = async (): Promise<void> => {
    if (!this.sdk) return

    try {
      const playbackState = await this.sdk.player.getCurrentlyPlayingTrack()
      if (
        !playbackState ||
        (playbackState.currently_playing_type !== 'track' &&
          playbackState.currently_playing_type !== 'episode')
      ) {
        if (this.lastPlaybackState !== false) {
          this.lastPlaybackState = false
          this.state = {
            ...this.state,
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
          ...this.state,
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
      await handleSpotifyApiError(error, () => this.checkAndRefreshSdkToken())
    }
  }

  public forcePollAndBroadcast(): Promise<void> {
    return this.getCurrentlyPlaying()
  }

  public async refreshDevices(): Promise<void> {
    if (!this.sdk) {
      logger.warn('Cannot get devices: SDK not initialized.')
      return
    }
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

      this.state.devices = validDevices
      this.broadcastUpdate({
        type: 'SPOTIFY_UPDATE',
        payload: this.getState(),
      })
      logger.debug({ count: this.state.devices.length }, 'Devices refreshed')
    } catch (error) {
      logger.error({ err: error }, 'Error fetching Spotify devices')
    }
  }

  public async handleCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ): Promise<void> {
    if (!this.sdk && command !== 'GET_DEVICES') {
      logger.warn('Cannot execute command: SDK not initialized.')
      return
    }

    if (command === 'GET_DEVICES') {
      await this.refreshDevices()
      return
    }

    try {
      await this.executeSpotifyCommand(command, deviceId, volume, playlistUri)
      // After a command, schedule a poll in 500ms to get fresh state.
      setTimeout(() => this.getCurrentlyPlaying(), 500)
    } catch (error) {
      await logSpotifyCommandError(command, error)
    }
  }

  private async executeSpotifyCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ): Promise<void> {
    const device = deviceId || undefined
    switch (command) {
      case 'PLAY':
        // The SDK handles undefined deviceId correctly.
        // Call signature depends on whether a playlist is being targeted.
        if (playlistUri) {
          await this.sdk!.player.startResumePlayback(device, playlistUri)
        } else {
          await this.sdk!.player.startResumePlayback(device)
        }
        break
      case 'PAUSE':
        await this.sdk!.player.pausePlayback(device)
        break
      case 'NEXT':
        await this.sdk!.player.skipToNext(device)
        break
      case 'PREVIOUS':
        await this.sdk!.player.skipToPrevious(device)
        break
      case 'TRANSFER_PLAYBACK':
        if (deviceId) await this.sdk!.player.transferPlayback([deviceId], true)
        break
      case 'SET_VOLUME':
        if (volume !== undefined) {
          const clamped = Math.max(0, Math.min(100, Math.round(volume)))
          await this.sdk!.player.setPlaybackVolume(clamped, deviceId)
        }
        break
      case 'LOGIN':
        logger.debug('Received LOGIN command')
        break
      default:
        logger.warn({ command }, 'Unknown Spotify command')
    }
  }
}

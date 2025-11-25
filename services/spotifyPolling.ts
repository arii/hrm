import { AccessToken, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyData, UnifiedStateMessage } from '../types/websocket'
import { SpotifyTokenManager } from './spotifyTokenManager.js'
import logger from '../utils/logger.js'
import { SpotifyApiService } from './spotifyApiService'

type SpotifyCommand =
  | 'PLAY'
  | 'NEXT'
  | 'PREVIOUS'
  | 'LOGIN'
  | 'TRANSFER_PLAYBACK'
  | 'SET_VOLUME'
  | 'PAUSE'

export class SpotifyPolling {
  private tokenManager: SpotifyTokenManager
  private pollInterval: NodeJS.Timeout | null = null
  private tokenRefreshInterval: NodeJS.Timeout | null = null
  private broadcastState: (data: Partial<UnifiedStateMessage>) => void
  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null
  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
  }
  private sdk: SpotifyApi | null = null
  private apiService: SpotifyApiService | null = null

  constructor(broadcastState: (data: Partial<UnifiedStateMessage>) => void) {
    this.broadcastState = broadcastState
    this.tokenManager = new SpotifyTokenManager(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || ''
    )
    logger.debug('Spotify Polling Service Initialized.')
  }

  public async initialize(): Promise<void> {
    await this.initializeSdk()
    this.tokenRefreshInterval = setInterval(
      () => this.checkAndRefreshSdkToken(),
      1000 * 60 * 5
    )
  }

  private async initializeSdk() {
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

  private setupSdk(accessToken: AccessToken) {
    this.sdk = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID || '',
      accessToken
    )
    this.apiService = new SpotifyApiService(this.sdk)
  }

  private async checkAndRefreshSdkToken() {
    const newTokenString = await this.tokenManager.getValidAccessToken()
    if (newTokenString && this.sdk) {
      const sdkToken = this.tokenManager.getSdkAccessToken()
      if (sdkToken) {
        this.setupSdk(sdkToken)
      }
    }
  }

  public getState(): SpotifyData {
    return { ...this.state }
  }

  public setRefreshToken(_token: string) {
    logger.debug('Spotify Refresh Token signal received. Reloading SDK.')
    setTimeout(() => this.initializeSdk(), 1000)
  }

  public startPolling(intervalMs: number = 3000) {
    if (this.pollInterval) return
    this.pollInterval = setInterval(
      () => this.getCurrentlyPlaying(),
      intervalMs
    )
    logger.debug('Spotify polling started.')
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
      logger.debug('Spotify polling stopped.')
    }
  }

  public cleanup() {
    this.stopPolling()
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval)
      this.tokenRefreshInterval = null
      logger.debug('Token refresh interval cleared.')
    }
  }

  private getCurrentlyPlaying = async () => {
    if (!this.apiService) return

    const playbackState = await this.apiService.getCurrentlyPlaying()

    if (!playbackState) {
      if (this.lastPlaybackState !== false) {
        this.lastPlaybackState = false
        this.state = {
          trackName: 'Nothing is currently playing.',
          artist: '',
          isPlaying: false,
        }
        this.broadcastState({ spotifyData: this.getState() })
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

    if (item?.id !== this.lastTrackId || isPlaying !== this.lastPlaybackState) {
      this.lastTrackId = item?.id || null
      this.lastPlaybackState = isPlaying
      this.state = {
        trackName: trackName,
        artist: artistName,
        isPlaying: isPlaying,
      }
      this.broadcastState({ spotifyData: this.getState() })
    }
  }

  public async getAvailableDevices() {
    if (!this.apiService) {
      logger.warn('Cannot get devices: SDK not initialized.')
      return []
    }
    const response = await this.apiService.getAvailableDevices()
    return response.devices
  }

  public async handleCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ) {
    if (!this.apiService) {
      logger.warn('Cannot execute command: SDK not initialized.')
      return
    }

    await this.executeSpotifyCommand(command, deviceId, volume, playlistUri)
    setTimeout(() => this.getCurrentlyPlaying(), 500)
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
        await this.apiService!.startResumePlayback(deviceId!, playlistUri)
        break
      case 'PAUSE':
        await this.apiService!.pausePlayback(deviceId!)
        break
      case 'NEXT':
        await this.apiService!.skipToNext(deviceId!)
        break
      case 'PREVIOUS':
        await this.apiService!.skipToPrevious(deviceId!)
        break
      case 'TRANSFER_PLAYBACK':
        if (deviceId) {
          await this.apiService!.transferPlayback(deviceId)
        }
        break
      case 'SET_VOLUME':
        if (volume !== undefined) {
          const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)))
          await this.apiService!.setPlaybackVolume(clampedVolume, deviceId)
        }
        break
      case 'LOGIN':
        logger.debug('Received LOGIN command.')
        break
      default:
        logger.warn(`Unknown Spotify command: ${command}`)
    }
  }

  public forcePollAndBroadcast() {
    return this.getCurrentlyPlaying()
  }
}

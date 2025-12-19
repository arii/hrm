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

export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

export class SpotifyPolling {
  /**
   * Forces an immediate poll for the currently playing track, bypassing the current polling interval.
   * If a poll is already in progress, this method will do nothing to prevent overlapping requests.
   */
  public forcePollAndBroadcast() {
    if (this.isPollingRequestInProgress) {
      logger.debug(
        'Poll request is already in progress. Skipping forced poll.'
      )
      return
    }
    // Clear any existing timeout and poll immediately
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout)
    }
    try {
      this.getCurrentlyPlaying()
    } catch (error) {
      logger.error({ err: error }, 'Error during forcePollAndBroadcast')
    }
  }

  private tokenManager: SpotifyTokenManager
  private pollTimeout: NodeJS.Timeout | null = null
  private tokenRefreshInterval: NodeJS.Timeout | null = null
  private broadcastUpdate: (message: ServerMessage) => void

  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null

  // Backoff strategy properties
  private basePollingInterval: number
  private currentPollingInterval: number
  private maxPollingInterval: number = 60000 // 1 minute
  private backoffFactor: number = 2
  private consecutiveFailures: number = 0

  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
    devices: [],
    volume: 70,
    isMuted: false,
  }

  private sdk: SpotifyApi | null = null
  private isPollingEnabled: boolean = false
  private isPollingRequestInProgress: boolean = false

  private constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
    logger.debug('Spotify Polling Service Initialized.')

    this.tokenManager = new SpotifyTokenManager(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || ''
    )
    this.basePollingInterval = process.env.SPOTIFY_POLLING_INTERVAL_MS
      ? parseInt(process.env.SPOTIFY_POLLING_INTERVAL_MS, 10)
      : 3000
    this.currentPollingInterval = this.basePollingInterval
  }

  public static async create(
    broadcastUpdate: (message: ServerMessage) => void
  ): Promise<SpotifyPolling> {
    const instance = new SpotifyPolling(broadcastUpdate)
    await instance.initializeSdk()
    instance.tokenRefreshInterval = setInterval(
      () => instance.checkAndRefreshSdkToken(),
      1000 * 60 * 5
    )
    return instance
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

  public startPolling() {
    if (this.isPollingEnabled) return
    this.isPollingEnabled = true
    logger.debug(
      { intervalMs: this.currentPollingInterval },
      'Spotify polling started'
    )
    this.scheduleNextPoll()
  }

  public stopPolling() {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout)
      this.pollTimeout = null
    }
    this.isPollingEnabled = false
    logger.debug('Spotify polling stopped.')
  }

  public cleanup() {
    this.stopPolling()
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval)
      this.tokenRefreshInterval = null
    }
  }

  private scheduleNextPoll() {
    if (!this.isPollingEnabled) return
    this.pollTimeout = setTimeout(
      () => this.getCurrentlyPlaying(),
      this.currentPollingInterval
    )
  }

  private getCurrentlyPlaying = async () => {
    if (this.isPollingRequestInProgress) {
      return
    }

    if (!this.sdk) {
      this.scheduleNextPoll()
      return
    }

    this.isPollingRequestInProgress = true

    try {
      const playbackState = await this.sdk.player.getCurrentlyPlayingTrack()

      if (this.consecutiveFailures > 0) {
        logger.info(
          `Spotify API recovered after ${this.consecutiveFailures} failures. Resetting polling interval.`
        )
        this.consecutiveFailures = 0
        this.currentPollingInterval = this.basePollingInterval
      }

      if (!playbackState) {
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
      } else {
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
      }
    } catch (error) {
      const wasHandled = await handleSpotifyApiError(error, () =>
        this.checkAndRefreshSdkToken()
      )

      const status = (error as { status?: number })?.status
      if (status && status >= 500 && status < 600) {
        this.consecutiveFailures++
        const backoffDelay =
          this.basePollingInterval *
          Math.pow(this.backoffFactor, this.consecutiveFailures)
        this.currentPollingInterval = Math.min(
          this.maxPollingInterval,
          backoffDelay
        )
        logger.warn(
          `Spotify API server error. Increasing polling interval to ${this.currentPollingInterval}ms due to ${this.consecutiveFailures} consecutive failures.`
        )
      } else if (!wasHandled) {
        this.currentPollingInterval = this.basePollingInterval
      }
    } finally {
      this.isPollingRequestInProgress = false
      this.scheduleNextPoll()
    }
  }

  public async refreshDevices(): Promise<void> {
    if (!this.sdk) {
      logger.warn('Cannot get devices: SDK not initialized.')
      return
    }
    try {
      const response = await this.sdk.player.getAvailableDevices()
      const validDevices: SpotifyDevice[] = (response.devices || [])
        .filter((d: Device) => d.id !== null)
        .map((d: Device) => ({
          id: d.id as string,
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

  public handleCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ) {
    if (!this.sdk && command !== 'GET_DEVICES') {
      logger.warn('Cannot execute command: SDK not initialized.')
      return Promise.resolve()
    }

    if (command === 'GET_DEVICES') {
      this.refreshDevices()
      return
    }

    return (async () => {
      try {
        await this.executeSpotifyCommand(command, deviceId, volume, playlistUri)
        setTimeout(() => this.getCurrentlyPlaying(), 500)
      } catch (error) {
        await logSpotifyCommandError(command, error)
      }
    })()
  }

  private async executeSpotifyCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ) {
    switch (command) {
      case 'PLAY':
        if (playlistUri) {
          await this.sdk!.player.startResumePlayback(
            (deviceId || undefined) as unknown as string,
            playlistUri
          )
        } else {
          await this.sdk!.player.startResumePlayback(
            (deviceId || undefined) as unknown as string
          )
        }
        break
      case 'PAUSE':
        await this.sdk!.player.pausePlayback(
          (deviceId || undefined) as unknown as string
        )
        break
      case 'NEXT':
        await this.sdk!.player.skipToNext(
          (deviceId || undefined) as unknown as string
        )
        break
      case 'PREVIOUS':
        await this.sdk!.player.skipToPrevious(
          (deviceId || undefined) as unknown as string
        )
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
        logger.debug('Received LOGIN command')
        break
      default:
        logger.warn({ command }, 'Unknown Spotify command')
    }
  }
}

import { AccessToken, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { ServerMessage, SpotifyData } from '../types/websocket'
import { SpotifyCommandParameters, SpotifyCommand } from '../types/core'
import {
  SpotifyTokenManager,
  SpotifyTokenPayload,
} from './spotifyTokenManager.js'
import logger from '../utils/logger.server.js'
import {
  handleSpotifyApiError,
  logSpotifyCommandError,
} from './spotifyApiErrorHandling.js'
import { SpotifyService } from '../types/interfaces.js'
import { env } from '../lib/env.js'
import { ServiceInitializationError } from '../lib/errors.js'
import { SpotifyPlayerManager } from './spotifyPlayerManager.js'
import { SpotifyDeviceManager } from './spotifyDeviceManager.js'

export class SpotifyPolling implements SpotifyService {
  public forcePollAndBroadcast() {
    return this.getCurrentlyPlaying()
  }
  private tokenManager: SpotifyTokenManager
  private pollInterval: NodeJS.Timeout | null = null
  private devicePollInterval: NodeJS.Timeout | null = null
  private tokenRefreshInterval: NodeJS.Timeout | null = null
  private playerManager: SpotifyPlayerManager | null = null
  private deviceManager: SpotifyDeviceManager | null = null

  private readonly broadcastUpdate: (message: ServerMessage) => void

  private state: SpotifyData = {
    devices: [],
    playback: {
      track: {
        id: null,
        name: 'Awaiting Login...',
        artist: '',
        albumName: '',
        albumArtUrl: '',
      },
      is_playing: false,
      isMuted: false,
      volume_percent: 70,
      progress_ms: 0,
    },
  }

  private sdk: SpotifyApi | null = null
  private lastCommandTime: number = 0

  private constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
    logger.debug('Spotify Polling Service Initialized.')

    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
      throw new ServiceInitializationError(
        'Spotify client ID or secret not configured.'
      )
    }

    this.tokenManager = new SpotifyTokenManager(
      env.SPOTIFY_CLIENT_ID,
      env.SPOTIFY_CLIENT_SECRET
    )
  }

  private setState = (
    update: SpotifyData | ((prevState: SpotifyData) => SpotifyData)
  ) => {
    if (typeof update === 'function') {
      this.state = update(this.state)
    } else {
      this.state = update
    }
  }

  private getCurrentlyPlaying = async (force: boolean = false) => {
    try {
      if (!force && Date.now() - this.lastCommandTime < 2000) {
        logger.debug('Skipping poll due to recent command execution')
        return
      }

      if (!this.sdk || !this.playerManager) {
        logger.debug('Spotify SDK not initialized, skipping poll')
        return
      }

      await this.playerManager.refreshPlaybackState()
    } catch (error) {
      await handleSpotifyApiError(error, () => this.checkAndRefreshSdkToken())
    }
  }

  public _test_ =
    process.env.NODE_ENV === 'test'
      ? {
          setState: this.setState,
          setSdk: (sdk: SpotifyApi | null) => {
            this.sdk = sdk
          },
          getPollInterval: () => this.pollInterval,
          getTokenRefreshInterval: () => this.tokenRefreshInterval,
          setPollInterval: (interval: NodeJS.Timeout | null) => {
            this.pollInterval = interval
          },
          setTokenRefreshInterval: (interval: NodeJS.Timeout | null) => {
            this.tokenRefreshInterval = interval
          },
          getCurrentlyPlaying: this.getCurrentlyPlaying.bind(this),
        }
      : undefined

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refresh_token: _, ...tokenWithoutRefresh } = accessToken
    if (!env.SPOTIFY_CLIENT_ID) {
      logger.error('Spotify client ID not found, cannot initialize SDK.')
      return
    }
    const sdk = SpotifyApi.withAccessToken(
      env.SPOTIFY_CLIENT_ID,
      tokenWithoutRefresh as AccessToken
    )
    this.sdk = sdk
    this.playerManager = new SpotifyPlayerManager(
      this.sdk,
      this.broadcastUpdate,
      this.getState.bind(this),
      this.setState.bind(this)
    )
    this.deviceManager = new SpotifyDeviceManager(
      this.sdk,
      this.broadcastUpdate,
      this.getState.bind(this),
      this.setState.bind(this)
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
    return (
      this.sdk !== null &&
      this.playerManager !== null &&
      this.deviceManager !== null
    )
  }

  public async handleTokenUpdate(tokens: SpotifyTokenPayload): Promise<void> {
    logger.info(
      { tokens },
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
    if (this.pollInterval) return
    if (!this.isReady()) {
      logger.warn('Cannot start polling: Spotify service is not ready.')
      return
    }

    const trackIntervalMs = env.SPOTIFY_POLLING_INTERVAL_MS
    this.pollInterval = setInterval(
      () => this.getCurrentlyPlaying(),
      trackIntervalMs
    )

    const deviceIntervalMs = env.SPOTIFY_DEVICE_POLLING_INTERVAL_MS
    this.devicePollInterval = setInterval(
      () => this.deviceManager!.refreshDevices(),
      deviceIntervalMs
    )

    logger.debug(
      { trackIntervalMs, deviceIntervalMs },
      'Spotify polling started'
    )
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    if (this.devicePollInterval) {
      clearInterval(this.devicePollInterval)
      this.devicePollInterval = null
    }
    logger.debug('Spotify polling stopped.')
  }

  public cleanup() {
    // Stop all intervals to prevent leaks
    this.stopPolling()
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval)
      this.tokenRefreshInterval = null
      logger.debug('Token refresh interval cleared.')
    }
  }

  public async handleCommand(
    command: SpotifyCommand,
    params: SpotifyCommandParameters
  ): Promise<void> {
    if (!this.isReady()) {
      logger.warn('Spotify service not ready, command ignored.', { command })
      return
    }

    this.lastCommandTime = Date.now()

    // 1. Immediate Optimistic Broadcast for Play/Pause
    const previousIsPlaying = this.state.playback.is_playing
    if (command === 'PLAY' || command === 'PAUSE') {
      this.state = {
        ...this.state,
        playback: {
          ...this.state.playback,
          is_playing: command === 'PLAY',
        },
      }
      this.broadcastUpdate({ type: 'SPOTIFY_UPDATE', payload: this.getState() })
    }

    try {
      if (command === 'GET_DEVICES') {
        await this.deviceManager!.refreshDevices()
        return
      }

      if (command === 'LOGIN') {
        logger.debug('Received LOGIN command')
        return
      }

      // All other commands are player-related
      await this.playerManager!.executeSpotifyCommand(command, params)

      // 2. Schedule authoritative polls
      // A quick check that respects the window (likely skipped if < 2000ms)
      setTimeout(() => this.getCurrentlyPlaying(), 300)
      // A forced check after the window expires to ensure consistency
      setTimeout(() => this.getCurrentlyPlaying(true), 2100)
    } catch (error) {
      await logSpotifyCommandError(command, error)
      // 3. Revert state on failure
      if (command === 'PLAY' || command === 'PAUSE') {
        this.state = {
          ...this.state,
          playback: {
            ...this.state.playback,
            is_playing: previousIsPlaying,
          },
        }
        this.broadcastUpdate({
          type: 'SPOTIFY_UPDATE',
          payload: this.getState(),
        })
      }
      await this.getCurrentlyPlaying()
    }
  }
}

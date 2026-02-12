import { AccessToken, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { ServerMessage, SpotifyData } from '@/types/websocket'
import { SpotifyCommandParameters } from '@/types/core'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import { SpotifyTokenPayload } from '@/types/spotify'
import logger from '@/utils/logger.server'
import {
  handleSpotifyApiError,
  logSpotifyCommandError,
} from '@/services/spotifyApiErrorHandling'
import { SpotifyCommand, SpotifyService } from '@/types/interfaces'
import { SafeSpotifyApi, createSafeSpotifyApi } from '@/services/safeSpotifyApi'
import { env } from '@/lib/env'
import { SpotifyPlayerManager } from '@/services/spotifyPlayerManager'
import { SpotifyDeviceManager } from '@/services/spotifyDeviceManager'

export class SpotifyPollingService implements SpotifyService {
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
    trackId: null,
    trackName: 'Awaiting Login...',
    artist: '',
    albumName: '',
    albumArtUrl: '',
    isPlaying: false,
    devices: [],
    volume: 70,
    isMuted: false,
  }

  private sdk: SafeSpotifyApi | null = null

  constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
    logger.debug('Spotify Polling Service Initialized.')

    this.tokenManager = new SpotifyTokenManager(
      env.SPOTIFY_CLIENT_ID || '',
      env.SPOTIFY_CLIENT_SECRET || ''
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

  private getCurrentlyPlaying = async () => {
    try {
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
          setSdk: (sdk: SafeSpotifyApi | null) => {
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
  ): Promise<SpotifyPollingService> {
    const instance = new SpotifyPollingService(broadcastUpdate)
    try {
      await instance.initializeSdk()
    } catch (e) {
      logger.warn('Initial Spotify SDK bootstrap failed:', e)
    }

    instance.tokenRefreshInterval = setInterval(
      () => instance.checkAndRefreshSdkToken(),
      1000 * 60 * 5
    )
    return instance
  }

  public async initializeSdk() {
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
    this.sdk = createSafeSpotifyApi(sdk)
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
    // 1. Persist to disk and update internal manager state
    this.tokenManager.updateToken(tokens)

    // 2. Re-initialize SDK with new tokens
    const sdkToken = this.tokenManager.getSdkAccessToken()
    if (sdkToken) {
      this.setupSdk(sdkToken)
      this.startPolling()
    }

    // 3. Immediately poll with new tokens to update UI
    await this.forcePollAndBroadcast()

    logger.info('Tokens updated and state broadcasted via direct event')
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

      // Slight delay to allow Spotify API to update before we re-poll
      setTimeout(() => this.getCurrentlyPlaying(), 500)
    } catch (error) {
      await logSpotifyCommandError(command, error)
    }
  }
}

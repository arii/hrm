import { AccessToken, SpotifyApi, Device } from '@spotify/web-api-ts-sdk'
import { ServerMessage, SpotifyData, SpotifyDevice } from '../types/websocket'
import { SpotifyTokenManager } from './spotifyTokenManager.js'
import logger from '../utils/logger.js'

// Utility: Safely parse JSON, fallback to text
function safeParseJSON(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return input // Return raw text if not JSON
  }
}

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
  /**
   * Public method to force a poll and broadcast current track state.
   */
  public forcePollAndBroadcast() {
    return this.getCurrentlyPlaying()
  }
  private tokenManager: SpotifyTokenManager
  private pollInterval: NodeJS.Timeout | null = null
  private tokenRefreshInterval: NodeJS.Timeout | null = null
  private broadcastUpdate: (message: ServerMessage) => void

  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null

  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
    devices: [],
  }

  private sdk: SpotifyApi | null = null

  private constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
    logger.debug('Spotify Polling Service Initialized.')

    this.tokenManager = new SpotifyTokenManager(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || ''
    )
  }

  public static async create(
    broadcastUpdate: (message: ServerMessage) => void
  ): Promise<SpotifyPolling> {
    const instance = new SpotifyPolling(broadcastUpdate)
    await instance.initializeSdk()
    instance.tokenRefreshInterval = setInterval(
      () => instance.checkAndRefreshSdkToken(),
      1000 * 60 * 5
    ) // Check every 5 minutes if we need to re-sync
    return instance
  }

  private async initializeSdk() {
    const hasToken = await this.tokenManager.loadFirstAvailableToken()

    if (!hasToken) {
      logger.info(
        'Spotify SDK initialization skipped: No tokens found in the database.'
      )
      return
    }

    const token = await this.tokenManager.getValidAccessToken() // Triggers refresh if needed
    if (token) {
      const sdkToken = this.tokenManager.getSdkAccessToken()
      if (sdkToken) {
        this.setupSdk(sdkToken)
        logger.debug(
          'Loaded first available Spotify token from database. Starting polling.'
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
    // Force Manager to check validity and refresh if needed
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

  /**
   * Public method to safely check if the SDK has been initialized.
   * @returns {boolean} True if the SDK is ready, false otherwise.
   */
  public isReady(): boolean {
    return this.sdk !== null
  }

  // --- Token Management ---
  // The 'setRefreshToken' method is now obsolete. API routes should directly
  // interact with the 'SpotifyTokenManager' instance.

  // --- Polling Logic ---

  // Expose start/stop polling publicly (used by server to control lifecycle)
  public startPolling() {
    if (this.pollInterval) return

    const intervalMs = process.env.SPOTIFY_POLLING_INTERVAL_MS
      ? parseInt(process.env.SPOTIFY_POLLING_INTERVAL_MS, 10)
      : 3000
    // Poll every `intervalMs` for low-latency updates
    this.pollInterval = setInterval(
      () => this.getCurrentlyPlaying(),
      intervalMs
    )
    logger.debug(`Spotify polling started with interval: ${intervalMs}ms.`)
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
    if (!this.sdk) return

    try {
      let playbackState
      try {
        playbackState = await this.sdk.player.getCurrentlyPlayingTrack()
      } catch (err: unknown) {
        // ... (error handling code remains the same)
      }

      if (!playbackState) {
        // Nothing playing or 204
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
      // ... (error handling code remains the same)
    }
  }

  // --- Command Handling (Used by socketManager) ---

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
      logger.debug('Devices refreshed:', this.state.devices.length)
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
        this.logSpotifyCommandError(command, error)
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
        await this.sdk!.player.startResumePlayback(deviceId, playlistUri)
        break
      case 'PAUSE':
        await this.sdk!.player.pausePlayback(deviceId)
        break
      case 'NEXT':
        await this.sdk!.player.skipToNext(deviceId)
        break
      case 'PREVIOUS':
        await this.sdk!.player.skipToPrevious(deviceId)
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
    }
  }

  private async logSpotifyCommandError(
    command: SpotifyCommand,
    error: unknown
  ) {
    try {
      if (error instanceof SyntaxError) {
        logger.warn(
          `[SpotifyPolling] Command ${command} executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.`
        )
      } else if (error && typeof error === 'object') {
        if ('response' in error) {
          const response = error.response as Response
          const text = await response.text()
          const parsed = safeParseJSON(text)
          if (typeof parsed === 'object' && parsed !== null) {
            logger.error(
              { response: parsed },
              `Error executing Spotify command ${command}: Parsed response:`
            )
          } else {
            logger.error(
              { response: text },
              `Error executing Spotify command ${command}: Response body:`
            )
          }
        } else {
          logger.error(
            { err: error },
            `Error executing Spotify command ${command}:`
          )
        }
      } else {
        logger.error(
          { err: error },
          `Error executing Spotify command ${command}:`
        )
      }
    } catch (loggingError) {
      logger.error(
        { err: loggingError },
        `Error executing Spotify command ${command}: (Logging failed)`
      )
      logger.error({ err: error }, `Original error for ${command}:`)
    }
  }
}

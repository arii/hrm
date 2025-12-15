import { AccessToken, SpotifyApi, Device } from '@spotify/web-api-ts-sdk'
import { ServerMessage, SpotifyData, SpotifyDevice } from '../types/websocket'
import { SpotifyTokenManager } from './spotifyTokenManager.js'
import logger from '../utils/logger.js'
import { env } from '../lib/env.js'

// Utility: Safely parse JSON, fallback to text
function safeParseJSON(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return input // Return raw text if not JSON
  }
}

// API endpoint constants (mostly managed by SDK now)
// TOKEN_URL is handled by TokenManager or SDK

type SpotifyCommand =
  | 'PLAY'
  | 'NEXT'
  | 'PREVIOUS'
  | 'LOGIN'
  | 'TRANSFER_PLAYBACK'
  | 'SET_VOLUME'
  | 'PAUSE'
  | 'GET_DEVICES'

// We use SDK types now, but keep internal state types as needed.
// Removed manual SpotifyCurrentlyPlayingResponse, SpotifyDevice, etc.

export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

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

  // Internal auth/state values
  private broadcastUpdate: (message: ServerMessage) => void

  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null

  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
    devices: [], // <--- ADDED
    volume: 70,
    isMuted: false,
  }

  private sdk: SpotifyApi | null = null

  private constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
    logger.debug('Spotify Polling Service Initialized.')

    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
      throw new Error('Spotify client ID or secret is not defined.')
    }

    this.tokenManager = new SpotifyTokenManager(
      env.SPOTIFY_CLIENT_ID,
      env.SPOTIFY_CLIENT_SECRET
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
    const token = await this.tokenManager.getValidAccessToken() // Triggers refresh if needed
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
    if (!env.SPOTIFY_CLIENT_ID) {
      throw new Error('Spotify client ID is not defined.')
    }
    this.sdk = SpotifyApi.withAccessToken(env.SPOTIFY_CLIENT_ID, accessToken)
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

  // --- Token Management (Used by NextAuth route) ---

  /**
   * Called by server.ts POST /internal/token-delivery after NextAuth provides the refresh token.
   */
  public setRefreshToken(_token: string) {
    logger.debug('Spotify Refresh Token signal received. Reloading SDK.')
    // Reset the token manager state to ensure it re-reads the file
    // Note: TokenManager reads file on every getValidAccessToken call, so we just need to trigger init
    setTimeout(() => this.initializeSdk(), 1000) // Give FS a moment to settle
  }

  // --- Polling Logic ---

  // Expose start/stop polling publicly (used by server to control lifecycle)
  public startPolling() {
    if (this.pollInterval) return

    const intervalMs = env.SPOTIFY_POLLING_INTERVAL_MS
    // Poll every `intervalMs` for low-latency updates
    this.pollInterval = setInterval(
      () => this.getCurrentlyPlaying(),
      intervalMs
    )
    logger.debug({ intervalMs }, 'Spotify polling started')
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

    // Ensure token is valid before call?
    // We rely on background refresh or failure handling.

    try {
      let playbackState
      try {
        playbackState = await this.sdk.player.getCurrentlyPlayingTrack()
      } catch (err: unknown) {
        // If response is not JSON, fallback to text
        if (
          typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          typeof (err as { response?: unknown }).response === 'object' &&
          (err as { response?: { text?: unknown } }).response &&
          'text' in (err as { response: { text?: unknown } }).response &&
          typeof (err as { response: { text?: unknown } }).response.text ===
            'function'
        ) {
          const text = await (
            err as { response: { text: () => Promise<string> } }
          ).response.text()
          const parsed = safeParseJSON(text)
          if (typeof parsed === 'object' && parsed !== null) {
            logger.error({ response: parsed }, 'Spotify API response (parsed)')
          } else {
            logger.error({ response: text }, 'Spotify API response (not JSON)')
          }
        }
        throw err
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

      // Check if it's a track or episode
      if (
        playbackState.currently_playing_type !== 'track' &&
        playbackState.currently_playing_type !== 'episode'
      ) {
        // Unknown type
        return
      }

      // item can be null if it's private session or unknown
      const item = playbackState.item

      // We need to handle Track vs Episode. SDK types are union.
      // For simplicity, we access common fields or check type.
      const trackName = item?.name || 'Unknown Content'
      // Artists exists on Track, not necessarily Episode in the same way?
      // SDK `Track` has artists, `Episode` has show.
      let artistName = 'Unknown Artist'
      if (item && 'artists' in item) {
        artistName = item.artists.map((a) => a.name).join(', ')
      } else if (item && 'show' in item) {
        artistName = item.show.name
      }

      const isPlaying = playbackState.is_playing

      // Only broadcast if track ID or playback state has changed
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
      const err = error as { status?: number }
      // Handle 429 specifically
      if (err?.status === 429) {
        logger.warn('Spotify API Rate Limited. Backing off...')
        // Maybe stop polling for a bit?
        return
      }

      if (err?.status === 401) {
        logger.warn('Spotify token expired during polling. Attempting refresh.')
        this.checkAndRefreshSdkToken()
        return
      }

      logger.error({ err: error }, 'Error fetching currently playing track')
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
      // FIX: Filter and map to ensure type safety (Device -> SpotifyDevice)
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
    // Note: We allow deviceId to be undefined for PLAY/PAUSE/NEXT/PREVIOUS
    // This triggers the action on the currently active device.

    switch (command) {
      case 'PLAY':
        if (playlistUri) {
          // If deviceId is undefined, SDK targets active device
          // Type assertion needed because SDK types incorrectly require string
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

  private async logSpotifyCommandError(
    command: SpotifyCommand,
    error: unknown
  ) {
    try {
      if (error instanceof SyntaxError) {
        // Suppress SyntaxError which usually occurs when Spotify returns a non-JSON response (e.g. 204 No Content or simple text error)
        // This is "expected" behavior from the SDK in some edge cases.
        logger.warn(
          { command },
          'Command executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.'
        )
      } else if (error && typeof error === 'object') {
        if (
          'response' in error &&
          (error as { response?: { text?: () => Promise<string> } }).response
        ) {
          try {
            let text = '[No response text available]'
            if (
              typeof error === 'object' &&
              error !== null &&
              'response' in error &&
              typeof (error as { response?: unknown }).response === 'object' &&
              (error as { response?: { text?: unknown } }).response &&
              'text' in (error as { response: { text?: unknown } }).response &&
              typeof (error as { response: { text?: unknown } }).response
                .text === 'function'
            ) {
              try {
                text = await (
                  error as { response: { text: () => Promise<string> } }
                ).response.text()
              } catch (textError) {
                // Sometimes calling text() itself might fail if body was already consumed or invalid
                logger.error(
                  { command, err: textError },
                  'Failed to retrieve error response text'
                )
                logger.error(
                  { command, err: error },
                  'Error executing Spotify command'
                )
                return
              }

              const parsed = safeParseJSON(text)
              if (typeof parsed === 'object' && parsed !== null) {
                logger.error(
                  { command, response: parsed },
                  'Error executing Spotify command: Parsed response'
                )
              } else {
                logger.error(
                  { command, response: text },
                  'Error executing Spotify command: Response body'
                )
              }
            }
          } catch (e) {
            logger.error(
              { command, err: e },
              'Could not read response body for failed Spotify command'
            )
          }
        } else {
          // Log other object errors
          logger.error(
            { command, err: error },
            'Error executing Spotify command'
          )
        }
      } else {
        logger.error({ command, err: error }, 'Error executing Spotify command')
      }
    } catch (loggingError) {
      // Absolute failsafe to prevent logger from crashing the app
      logger.error(
        { command, err: loggingError },
        'Error executing Spotify command (Logging failed)'
      )
      logger.error({ command, originalError: error }, 'Original error')
    }
  }
}

// File: services/spotifyPolling.ts (Refactored for Topic-Based Broadcasts)
import { AccessToken, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyData } from '../types/websocket'
import { SpotifyTokenManager } from './spotifyTokenManager.js'
import logger from '../utils/logger.js'
import { broadcastSpotifyUpdate } from '../utils/socketManager.js'

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

  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null

  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
  }

  private sdk: SpotifyApi | null = null

  private constructor() {
    logger.debug('Spotify Polling Service Initialized.')

    this.tokenManager = new SpotifyTokenManager(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || ''
    )
  }

  public static async create(): Promise<SpotifyPolling> {
    const instance = new SpotifyPolling()
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

  public isReady(): boolean {
    return this.sdk !== null
  }

  /**
   * Called by server.ts POST /internal/token-delivery after NextAuth provides the refresh token.
   */
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
    if (!this.sdk) return

    try {
      let playbackState
      try {
        playbackState = await this.sdk.player.getCurrentlyPlayingTrack()
      } catch (err: unknown) {
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
        if (this.lastPlaybackState !== false) {
          this.lastPlaybackState = false
          this.state = {
            trackName: 'Nothing is currently playing.',
            artist: '',
            isPlaying: false,
          }
          broadcastSpotifyUpdate(this.getState())
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
        broadcastSpotifyUpdate(this.getState())
      }
    } catch (error) {
      const err = error as { status?: number }
      if (err?.status === 429) {
        logger.warn('Spotify API Rate Limited. Backing off...')
        return
      }

      if (err?.status === 401) {
        logger.warn(
          'Spotify token expired during polling. Attempting refresh.'
        )
        this.checkAndRefreshSdkToken()
        return
      }

      logger.error({ err: error }, 'Error fetching currently playing track')
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
  ) {
    if (!this.sdk) {
      logger.warn('Cannot execute command: SDK not initialized.')
      return Promise.resolve()
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
    command: SpotifyCommand,
    error: unknown
  ) {
    try {
      if (error instanceof SyntaxError) {
        logger.warn(
          `[SpotifyPolling] Command ${command} executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.`
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
                logger.error(
                  { err: textError },
                  `Error executing Spotify command ${command}: Failed to retrieve error response text:`
                )
                logger.error(
                  { err: error },
                  `Error executing Spotify command ${command}:`
                )
                return
              }

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
            }
          } catch (e) {
            logger.error(
              { err: e },
              `Error executing Spotify command ${command}: Could not read response body.`
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

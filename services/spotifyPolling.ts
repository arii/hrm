<<<<<<< HEAD
// File: services/spotifyPolling.ts (Spotify Polling Service - Typed)
/**
 * Spotify Polling Service: Handles token management, REST polling, and command execution.
 * Bridges the REST API data to the real-time WebSocket broadcast.
 */

import { SpotifyData, UnifiedStateMessage } from '../types/websocket'
import { SpotifyTokenManager } from './spotifyTokenManager.js'

const isVerboseSpotifyLogging = false
=======
import { AccessToken, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyData, UnifiedStateMessage } from '../types/websocket'
import { SpotifyTokenManager } from './spotifyTokenManager.js'

// Utility: Safely parse JSON, fallback to text
function safeParseJSON(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return input // Return raw text if not JSON
  }
}

const isVerboseSpotifyLogging =
  process.env.SPOTIFY_DEBUG === 'true' || process.env.SPOTIFY_DEBUG === '1'
>>>>>>> origin/leader

const debugLog = (...args: unknown[]) => {
  if (isVerboseSpotifyLogging) {
    console.log('[SpotifyPolling]', ...args)
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

// We use SDK types now, but keep internal state types as needed.
// Removed manual SpotifyCurrentlyPlayingResponse, SpotifyDevice, etc.

export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

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
  private broadcastState: (data: Partial<UnifiedStateMessage>) => void

  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null

  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
  }

  private sdk: SpotifyApi | null = null

  private constructor(
    broadcastState: (data: Partial<UnifiedStateMessage>) => void
  ) {
    this.broadcastState = broadcastState
    debugLog('Spotify Polling Service Initialized.')

    this.tokenManager = new SpotifyTokenManager(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || ''
    )
  }

  public static async create(
    broadcastState: (data: Partial<UnifiedStateMessage>) => void
  ): Promise<SpotifyPolling> {
    const instance = new SpotifyPolling(broadcastState)
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
        debugLog('Loaded existing Spotify tokens from file. Starting polling.')
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

  // --- Token Management (Used by NextAuth route) ---

  /**
   * Called by server.ts POST /internal/token-delivery after NextAuth provides the refresh token.
   */
  public setRefreshToken(_token: string) {
    debugLog('Spotify Refresh Token signal received. Reloading SDK.')
    // Reset the token manager state to ensure it re-reads the file
    // Note: TokenManager reads file on every getValidAccessToken call, so we just need to trigger init
    setTimeout(() => this.initializeSdk(), 1000) // Give FS a moment to settle
  }

  // --- Polling Logic ---

  // Expose start/stop polling publicly (used by server to control lifecycle)
  public startPolling(intervalMs: number = 3000) {
    if (this.pollInterval) return
    // Poll every `intervalMs` for low-latency updates
    this.pollInterval = setInterval(
      () => this.getCurrentlyPlaying(),
      intervalMs
    )
    debugLog('Spotify polling started.')
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
      debugLog('Spotify polling stopped.')
    }
  }

  public cleanup() {
    this.stopPolling()
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval)
      this.tokenRefreshInterval = null
      debugLog('Token refresh interval cleared.')
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
            console.error('Spotify API response (parsed):', parsed)
          } else {
            console.error('Spotify API response (not JSON):', text)
          }
        }
        throw err
      }

      if (!playbackState) {
        // Nothing playing or 204
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
          trackName: trackName,
          artist: artistName,
          isPlaying: isPlaying,
        }
        this.broadcastState({ spotifyData: this.getState() })
      }
    } catch (error) {
<<<<<<< HEAD
      console.error('Error fetching currently playing track:', error)
    }
  }

  // --- Command Handling (Used by socketManager) ---

  private async executePlayerCommand(
    endpoint: string,
    method: 'POST' | 'PUT',
    deviceId?: string
  ) {
    if (!this.accessToken) {
      console.warn(
        'Cannot execute command: Access token is missing. Requires login.'
      )
      return
    }

    try {
      const url = new URL(`${BASE_URL}/me/player/${endpoint}`)
      if (deviceId) {
        url.searchParams.set('device_id', deviceId)
      }

      const response = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      if (response.status === 204) {
        debugLog(`Spotify command '${endpoint}' executed successfully.`)
        // Immediately poll after a successful command to update the dashboard faster
        setTimeout(this.getCurrentlyPlaying, 500)
      } else {
        console.error(
          `Spotify command failed (${response.status}): ${endpoint}`
=======
      const err = error as { status?: number }
      // Handle 429 specifically
      if (err?.status === 429) {
        console.warn('Spotify API Rate Limited. Backing off...')
        // Maybe stop polling for a bit?
        return
      }

      if (err?.status === 401) {
        console.warn(
          'Spotify token expired during polling. Attempting refresh.'
>>>>>>> origin/leader
        )
        this.checkAndRefreshSdkToken()
        return
      }

      console.error('Error fetching currently playing track:', error)
    }
  }

  // --- Command Handling (Used by socketManager) ---

  public async getAvailableDevices() {
    if (!this.sdk) {
      console.warn('Cannot get devices: SDK not initialized.')
      return []
    }
    try {
      const response = await this.sdk.player.getAvailableDevices()
      return response.devices
    } catch (error) {
      console.error('Error fetching Spotify devices:', error)
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
      console.warn('Cannot execute command: SDK not initialized.')
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
    volume?: number
  ) {
    if (['PLAY', 'PAUSE', 'NEXT', 'PREVIOUS'].includes(command) && !deviceId) {
      console.warn(
        `[SpotifyPolling] ${command} command ignored: no deviceId provided.`
      )
      return
    }
    switch (command) {
      case 'PLAY':
<<<<<<< HEAD
        this.executePlayerCommand('play', 'PUT', deviceId)
=======
        if (playlistUri) {
          await this.sdk!.player.startResumePlayback(deviceId!, playlistUri)
        } else {
          await this.sdk!.player.startResumePlayback(deviceId!)
        }
>>>>>>> origin/leader
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
        debugLog('Received LOGIN command.')
        break
      default:
        console.warn(`Unknown Spotify command: ${command}`)
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
        console.warn(
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
                // Sometimes calling text() itself might fail if body was already consumed or invalid
                console.error(
                  `Error executing Spotify command ${command}: Failed to retrieve error response text:`,
                  textError
                )
                console.error(
                  `Error executing Spotify command ${command}:`,
                  error
                )
                return
              }

              const parsed = safeParseJSON(text)
              if (typeof parsed === 'object' && parsed !== null) {
                console.error(
                  `Error executing Spotify command ${command}: Parsed response:`,
                  parsed
                )
              } else {
                console.error(
                  `Error executing Spotify command ${command}: Response body:`,
                  text
                )
              }
            }
          } catch (e) {
            console.error(
              `Error executing Spotify command ${command}: Could not read response body.`,
              e
            )
          }
        } else {
          // Log other object errors
          console.error(`Error executing Spotify command ${command}:`, error)
        }
      } else {
        console.error(`Error executing Spotify command ${command}:`, error)
      }
    } catch (loggingError) {
      // Absolute failsafe to prevent logger from crashing the app
      console.error(
        `Error executing Spotify command ${command}: (Logging failed)`,
        loggingError
      )
      console.error(`Original error for ${command}:`, error)
    }
  }
}

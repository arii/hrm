// File: services/spotifyPolling.ts (Spotify Polling Service - Typed)
/**
 * Spotify Polling Service: Handles token management, REST polling, and command execution.
 * Bridges the REST API data to the real-time WebSocket broadcast.
 */
import { AccessToken, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyData, UnifiedStateMessage } from '../types/websocket'
import { SpotifyTokenManager } from './spotifyTokenManager.js'

const isVerboseSpotifyLogging =
  process.env.SPOTIFY_DEBUG === 'true' || process.env.SPOTIFY_DEBUG === '1'

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
      const playbackState = await this.sdk.player.getCurrentlyPlayingTrack()

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

    // Wrap in async IIFE to handle promise without blocking caller
    return (async () => {
      try {
        // Most player commands require a device ID.
        if (
          ['PLAY', 'PAUSE', 'NEXT', 'PREVIOUS'].includes(command) &&
          !deviceId
        ) {
          console.warn(
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
              const clampedVolume = Math.max(
                0,
                Math.min(100, Math.round(volume))
              )
              await this.sdk!.player.setPlaybackVolume(clampedVolume, deviceId)
            }
            break
          case 'LOGIN':
            debugLog('Received LOGIN command.')
            break
          default:
            console.warn(`Unknown Spotify command: ${command}`)
        }

        // Refresh state shortly after command
        setTimeout(() => this.getCurrentlyPlaying(), 500)
      } catch (error) {
        console.error(`Error executing Spotify command ${command}:`, error)
      }
    })()
  }
}

export default SpotifyPolling

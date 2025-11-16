// File: services/spotifyPolling.ts
/**
 * Spotify Polling Service: Handles token management, polling, and command execution.
 * Bridges the REST API data to the real-time WebSocket broadcast.
 */

import { SpotifyData, UnifiedStateMessage } from '../types/websocket'
import { SpotifyTokenManager } from './spotifyTokenManager.js'
import {
  SpotifyCommand,
  SpotifyDevice,
  SpotifyCurrentlyPlayingResponse,
} from '../types/spotify'
import * as spotifyApi from './spotifyApi.js'

const isVerboseSpotifyLogging =
  process.env.SPOTIFY_DEBUG === 'true' ||
  process.env.SPOTIFY_DEBUG === '1' ||
  process.env.NODE_ENV !== 'production'

const debugLog = (...args: unknown[]) => {
  if (isVerboseSpotifyLogging) {
    console.log('[SpotifyPolling]', ...args)
  }
}

export class SpotifyPolling {
  private tokenManager: SpotifyTokenManager
  private pollInterval: NodeJS.Timeout | null = null
  private tokenRefreshInterval: NodeJS.Timeout | null = null

  // Internal auth/state values
  private refreshToken: string | null = null
  private accessToken: string | null = null
  private broadcastState: (data: Partial<UnifiedStateMessage>) => void

  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null

  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
  }

  constructor(broadcastState: (data: Partial<UnifiedStateMessage>) => void) {
    this.broadcastState = broadcastState
    debugLog('Spotify Polling Service Initialized.')

    this.tokenManager = new SpotifyTokenManager(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || ''
    )

    // Load existing token from file if available
    this.loadTokenFromManager()

    // Start token refresh check loop (Every 55 mins)
    this.tokenRefreshInterval = setInterval(
      () => this.refreshAccessToken(),
      1000 * 60 * 55
    )
  }

  private async loadTokenFromManager() {
    const token = await this.tokenManager.getValidAccessToken()
    if (token) {
      this.accessToken = token
      const refreshToken = this.tokenManager.getCurrentRefreshToken()
      if (refreshToken) {
        this.refreshToken = refreshToken
        debugLog('Loaded existing Spotify tokens from file. Starting polling.')
        this.startPolling()
      }
    }
  }

  public getState(): SpotifyData {
    return { ...this.state }
  }

  public setRefreshToken(token: string) {
    this.refreshToken = token
    this.tokenManager.setRefreshToken(token)
    debugLog(
      'Spotify Refresh Token received. Attempting initial access token refresh.'
    )
    this.refreshAccessToken(true)
  }

  private async refreshAccessToken(initial: boolean = false): Promise<void> {
    const newAccessToken = await this.tokenManager.refreshAccessToken()
    if (newAccessToken) {
      this.accessToken = newAccessToken
      debugLog('Access token refreshed successfully.')
      if (initial && !this.pollInterval) {
        this.startPolling()
      }
    } else {
      console.error('Failed to refresh Spotify access token.')
    }
  }

  public startPolling(intervalMs: number = 3000) {
    if (this.pollInterval) return
    debugLog('Spotify polling started.')
    this.pollInterval = setInterval(this.getCurrentlyPlaying, intervalMs)
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
    if (!this.accessToken) return

    const maskedAccessToken = this.accessToken.substring(0, 5) + '...'
    debugLog(
      'Fetching currently playing track with access token:',
      maskedAccessToken
    )

    try {
      const data = await spotifyApi.getCurrentlyPlaying(this.accessToken)

      if (!data) {
        debugLog('Currently playing: No content (204).')
        // No content - nothing is playing on the user's account
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

      debugLog('Successfully fetched currently playing track.')

      // Only broadcast if track ID or playback state has changed
      if (
        data.item?.id !== this.lastTrackId ||
        data.is_playing !== this.lastPlaybackState
      ) {
        this.lastTrackId = data.item?.id
        this.lastPlaybackState = data.is_playing
        this.state = {
          trackName: data.item?.name || 'Unknown Track',
          artist: data.item?.artists?.[0]?.name || 'Unknown Artist',
          isPlaying: data.is_playing,
        }
        this.broadcastState({ spotifyData: this.getState() })
      }
    } catch (error) {
      console.error('Error fetching currently playing track:', error)
      // Attempt to refresh token on auth error
      if (error instanceof Error && error.message.includes('401')) {
        console.warn('Spotify token expired or invalid. Attempting refresh...')
        this.refreshAccessToken()
      }
    }
  }

  public async getAvailableDevices(): Promise<SpotifyDevice[]> {
    if (!this.accessToken) {
      console.warn('Cannot get devices: Access token is missing.')
      return []
    }
    try {
      return await spotifyApi.getAvailableDevices(this.accessToken)
    } catch (error) {
      console.error('Error fetching Spotify devices:', error)
      return []
    }
  }

  public async setVolume(volume: number, deviceId?: string): Promise<boolean> {
    if (!this.accessToken) {
      console.warn('Cannot set volume: Access token is missing.')
      return false
    }
    try {
      await spotifyApi.setVolume(this.accessToken, volume, deviceId)
      debugLog(
        `Volume set to: ${volume}%${deviceId ? ` (device ${deviceId})` : ''}`
      )
      return true
    } catch (error) {
      console.error('Error setting volume:', error)
      return false
    }
  }

  public async transferPlayback(deviceId: string): Promise<boolean> {
    if (!this.accessToken) {
      console.warn('Cannot transfer playback: Access token is missing.')
      return false
    }
    try {
      await spotifyApi.transferPlayback(this.accessToken, deviceId)
      debugLog(`Playback transferred to device: ${deviceId}`)
      setTimeout(this.getCurrentlyPlaying, 500) // Refresh state
      return true
    } catch (error) {
      console.error('Error transferring Spotify playback:', error)
      return false
    }
  }

  private async executePlayerCommand(
    endpoint: 'play' | 'pause' | 'next' | 'previous',
    method: 'PUT' | 'POST',
    deviceId?: string
  ) {
    if (!this.accessToken) {
      console.warn(
        'Cannot execute command: Access token is missing. Requires login.'
      )
      return
    }

    try {
      await spotifyApi.executePlayerCommand(
        this.accessToken,
        endpoint,
        method,
        deviceId
      )
      debugLog(`Spotify command '${endpoint}' executed successfully.`)
      // Immediately poll after a successful command to update the dashboard faster
      setTimeout(this.getCurrentlyPlaying, 500)
    } catch (error) {
      console.error(`Error executing Spotify command '${endpoint}':`, error)
    }
  }

  public handleCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number
  ) {
    if (!this.accessToken) {
      console.warn(`Cannot execute command '${command}': No access token.`)
      return
    }

    switch (command) {
      case 'PLAY':
        this.executePlayerCommand('play', 'PUT', deviceId)
        break
      case 'PAUSE':
        this.executePlayerCommand('pause', 'PUT', deviceId)
        break
      case 'NEXT':
        this.executePlayerCommand('next', 'POST', deviceId)
        break
      case 'PREVIOUS':
        this.executePlayerCommand('previous', 'POST', deviceId)
        break
      case 'TRANSFER_PLAYBACK':
        if (deviceId) {
          this.transferPlayback(deviceId)
        } else {
          console.warn('TRANSFER_PLAYBACK command requires a deviceId.')
        }
        break
      case 'SET_VOLUME':
        if (volume !== undefined && volume >= 0 && volume <= 100) {
          this.setVolume(volume, deviceId)
        } else {
          console.warn('SET_VOLUME command requires a valid volume (0-100).')
        }
        break
      case 'LOGIN':
        // Note: The actual login is handled by the client redirecting to NextAuth.
        // This command is primarily for client-side feedback.
        debugLog(
          'Received LOGIN command. Client should initiate NextAuth sign-in.'
        )
        break
      default:
        console.warn(`Unknown Spotify command: ${command}`)
    }
  }

  async getCurrentPlayback(): Promise<SpotifyCurrentlyPlayingResponse | null> {
    const accessToken = await this.tokenManager.getValidAccessToken()
    if (!accessToken) {
      throw new Error('No valid Spotify access token available')
    }

    try {
      return await spotifyApi.getCurrentlyPlaying(accessToken)
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        // Token might be invalid - force a refresh on next attempt
        return null
      }
      throw error
    }
  }

  async controlPlayback(
    action: 'play' | 'pause' | 'next' | 'previous'
  ): Promise<boolean> {
    const accessToken = await this.tokenManager.getValidAccessToken()
    if (!accessToken) return false

    const methodMap = {
      play: 'PUT' as const,
      pause: 'PUT' as const,
      next: 'POST' as const,
      previous: 'POST' as const,
    }

    try {
      await spotifyApi.executePlayerCommand(
        accessToken,
        action,
        methodMap[action]
      )
      return true
    } catch (err) {
      console.error('Spotify playback control failed:', err)
      return false
    }
  }
}

export default SpotifyPolling

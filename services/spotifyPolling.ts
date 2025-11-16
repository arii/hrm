// File: services/spotifyPolling.ts
/**
 * Spotify Polling Service: Handles token management, polling, and command execution.
 */

import { SpotifyData, UnifiedStateMessage } from '../types/websocket'
import { SpotifyTokenManager } from './spotifyTokenManager.js'
import { SpotifyCommand, SpotifyDevice } from '../types/spotify'
import * as spotifyApi from './spotifyApi.js'

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
    this.tokenRefreshInterval = setInterval(() => this.refreshAccessToken(), 1000 * 60 * 55)
  }

  private async loadTokenAndStartPolling() {
    this.accessToken = await this.tokenManager.getValidAccessToken()
    if (this.accessToken) {
      console.log('Loaded existing Spotify token. Starting polling.')
      this.startPolling()
    }
  }

  public getState(): SpotifyData {
    return { ...this.state }
  }

  public setRefreshToken(token: string): void {
    console.log('Spotify Refresh Token received.')
    this.tokenManager.setRefreshToken(token)
    this.tokenManager.refreshAccessToken().then(newToken => {
      if (newToken) {
        this.accessToken = newToken
        if (!this.pollInterval) {
          this.startPolling()
        }
      }
    })
  }

  public startPolling(intervalMs: number = 3000) {
    if (this.pollInterval) return
    console.log('Spotify polling started.')
    this.pollInterval = setInterval(this.pollCurrentlyPlaying, intervalMs)
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
      console.log('Spotify polling stopped.')
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
        this.accessToken = await this.tokenManager.refreshAccessToken()
      }
    }
  }

  public async getAvailableDevices(): Promise<SpotifyDevice[]> {
    if (!this.accessToken) return []
    return spotifyApi.getAvailableDevices(this.accessToken)
  }

  public async handleCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number
  ) {
    if (!this.accessToken) {
      console.warn(`Cannot execute command '${command}': No access token.`)
      return
    }

    try {
      switch (command) {
        case 'PLAY':
          await spotifyApi.executePlayerCommand(this.accessToken, 'play', 'PUT', deviceId)
          break
        case 'PAUSE':
          await spotifyApi.executePlayerCommand(this.accessToken, 'pause', 'PUT', deviceId)
          break
        case 'NEXT':
          await spotifyApi.executePlayerCommand(this.accessToken, 'next', 'POST', deviceId)
          break
        case 'PREVIOUS':
          await spotifyApi.executePlayerCommand(
            this.accessToken,
            'previous',
            'POST',
            deviceId
          )
          break
        case 'TRANSFER_PLAYBACK':
          if (deviceId) await spotifyApi.transferPlayback(this.accessToken, deviceId)
          else console.warn('TRANSFER_PLAYBACK requires a deviceId.')
          break
        case 'SET_VOLUME':
          if (volume !== undefined) await spotifyApi.setVolume(this.accessToken, volume, deviceId)
          else console.warn('SET_VOLUME requires a volume.')
          break
        case 'LOGIN':
          console.log('LOGIN command received. Client should handle auth flow.')
          break
        default:
          console.warn(`Unknown Spotify command: ${command}`)
          return
      }
      // Immediately poll for faster UI update
      setTimeout(this.pollCurrentlyPlaying, 500)
    } catch (error) {
      console.error(`Failed to execute Spotify command '${command}':`, error)
    }
  }
}

export default SpotifyPolling

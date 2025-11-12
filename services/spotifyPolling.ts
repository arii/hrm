// File: services/spotifyPolling.ts (Spotify Polling Service - Typed)
/**
 * Spotify Polling Service: Handles token management, REST polling, and command execution.
 * Bridges the REST API data to the real-time WebSocket broadcast.
 */

import { SpotifyData, UnifiedStateMessage } from '../types/websocket'
import { SpotifyTokenManager } from './spotifyTokenManager.js'

const isVerboseSpotifyLogging =
  process.env.SPOTIFY_DEBUG === 'true' ||
  process.env.SPOTIFY_DEBUG === '1' ||
  process.env.NODE_ENV !== 'production'

const debugLog = (...args: unknown[]) => {
  if (isVerboseSpotifyLogging) {
    console.log('[SpotifyPolling]', ...args)
  }
}

// API endpoint constants
const BASE_URL = 'https://api.spotify.com/v1'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'

type SpotifyCommand =
  | 'PLAY'
  | 'NEXT'
  | 'PREVIOUS'
  | 'LOGIN'
  | 'TRANSFER_PLAYBACK'
  | 'SET_VOLUME'
  | 'PAUSE'

interface SpotifyCurrentlyPlayingResponse {
  timestamp: number
  context: {
    external_urls: {
      spotify: string
    }
    href: string
    type: string
    uri: string
  }
  progress_ms: number
  is_playing: boolean
  item: {
    album: {
      album_type: string
      artists: Array<{
        external_urls: {
          spotify: string
        }
        href: string
        id: string
        name: string
        type: string
        uri: string
      }>
      external_urls: {
        spotify: string
      }
      href: string
      id: string
      images: Array<{
        height: number
        url: string
        width: number
      }>
      name: string
      release_date: string
      release_date_precision: string
      total_tracks: number
      type: string
      uri: string
    }
    artists: Array<{
      external_urls: {
        spotify: string
      }
      href: string
      id: string
      name: string
      type: string
      uri: string
    }>
    available_markets: string[]
    disc_number: number
    duration_ms: number
    explicit: boolean
    external_ids: {
      isrc: string
    }
    external_urls: {
      spotify: string
    }
    href: string
    id: string
    is_local: boolean
    name: string
    popularity: number
    preview_url: string
    track_number: number
    type: string
    uri: string
  }
  currently_playing_type: string
  actions: {
    disallows: {
      resuming: boolean
      skipping_prev: boolean
    }
  }
}

export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

export interface SpotifyDevice {
  id: string
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number
}

interface SpotifyDevicesResponse {
  devices: SpotifyDevice[]
}

export class SpotifyPolling {
  private tokenManager: SpotifyTokenManager
  private pollInterval: NodeJS.Timeout | null = null

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
    setInterval(() => this.refreshAccessToken(), 1000 * 60 * 55)
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

  // --- Token Management (Used by NextAuth route) ---

  /**
   * Called by server.ts POST /internal/token-delivery after NextAuth provides the refresh token.
   */
  public setRefreshToken(token: string) {
    this.refreshToken = token
    debugLog(
      'Spotify Refresh Token received. Attempting initial access token refresh.'
    )
    this.refreshAccessToken(true)
  }

  private async refreshAccessToken(initial: boolean = false): Promise<void> {
    if (!this.refreshToken) {
      if (!initial) {
        this.broadcastState({
          spotifyData: {
            trackName: 'Requires Login',
            artist: 'Please log in via client/control',
            isPlaying: false,
          },
        })
      }
      return
    }

    // Generate Base64 string for Authorization header
    const authString = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64')

    try {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }).toString(),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(
          `Token refresh failed: ${response.status} - ${errorBody}`
        )
      }

      const data = (await response.json()) as SpotifyTokenResponse
      this.accessToken = data.access_token
      debugLog(
        'Spotify Access Token refreshed successfully.',
        'Status:',
        response.status
      )

      // Start polling if not already running
      if (!this.pollInterval) {
        this.startPolling()
      }
    } catch (error) {
      console.error('Error during Spotify token refresh:', error)
      this.accessToken = null
      this.stopPolling()
    }
  }

  // --- Polling Logic ---

  // Expose start/stop polling publicly (used by server to control lifecycle)
  public startPolling(intervalMs: number = 3000) {
    if (this.pollInterval) return
    // Poll every `intervalMs` for low-latency updates
    this.pollInterval = setInterval(this.getCurrentlyPlaying, intervalMs)
    debugLog('Spotify polling started.')
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
      debugLog('Spotify polling stopped.')
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
      const response = await fetch(`${BASE_URL}/me/player/currently-playing`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      if (response.status === 204) {
        debugLog('Currently playing: No content (204).')
        // 204 No Content - nothing is playing on the user's account
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

      if (!response.ok) {
        const responseBody = await response.text()
        console.error(
          'Error fetching currently playing track. Status:',
          response.status,
          'Body:',
          responseBody
        )
        if (response.status === 401) {
          console.warn(
            'Spotify token expired or invalid. Attempting refresh...'
          )
          this.refreshAccessToken()
        }
        return
      }

      const data = (await response.json()) as SpotifyCurrentlyPlayingResponse
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
        )
      }
    } catch (error) {
      console.error('Error executing Spotify command:', error)
    }
  }

  public async getAvailableDevices(): Promise<SpotifyDevice[]> {
    if (!this.accessToken) {
      console.warn('Cannot get devices: Access token is missing.')
      return []
    }
    try {
      const response = await fetch(`${BASE_URL}/me/player/devices`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch devices: ${response.status}`)
      }
      const data = (await response.json()) as SpotifyDevicesResponse
      return data.devices as SpotifyDevice[]
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
      const safeVolume = Math.max(0, Math.min(100, Math.round(volume)))
      const volumeUrl = new URL(`${BASE_URL}/me/player/volume`)
      volumeUrl.searchParams.set('volume_percent', String(safeVolume))
      if (deviceId) {
        volumeUrl.searchParams.set('device_id', deviceId)
      }

      const response = await fetch(volumeUrl.toString(), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })
      if (response.status === 204) {
        debugLog(
          `Volume set to: ${safeVolume}%${
            deviceId ? ` (device ${deviceId})` : ''
          }`
        )
        return true
      } else {
        console.error(
          `Failed to set volume: HTTP ${response.status}`,
          await response.text()
        )
        return false
      }
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
      const response = await fetch(`${BASE_URL}/me/player`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: true, // Start playback on the new device
        }),
      })
      if (response.status === 204) {
        debugLog(`Playback transferred to device: ${deviceId}`)
        setTimeout(this.getCurrentlyPlaying, 500) // Refresh state
        return true
      } else {
        console.error(
          `Failed to transfer playback (${
            response.status
          }): ${await response.text()}`
        )
        return false
      }
    } catch (error) {
      console.error('Error transferring Spotify playback:', error)
      return false
    }
  }

  public handleCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number
  ) {
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

    const response = await fetch('https://api.spotify.com/v1/me/player', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be invalid - force a refresh on next attempt
        return null
      }
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    return (await response.json()) as SpotifyCurrentlyPlayingResponse
  }

  async controlPlayback(
    action: 'play' | 'pause' | 'next' | 'previous'
  ): Promise<boolean> {
    const accessToken = await this.tokenManager.getValidAccessToken()
    if (!accessToken) return false

    const endpoint = {
      play: '/play',
      pause: '/pause',
      next: '/next',
      previous: '/previous',
    }[action]

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/player${endpoint}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      return response.ok
    } catch (err) {
      console.error('Spotify playback control failed:', err)
      return false
    }
  }

  // (Legacy duplicate start/stop removed — public startPolling/stopPolling above are used.)
}

export default SpotifyPolling

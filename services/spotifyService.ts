import { SpotifyApi, AccessToken } from '@spotify/web-api-ts-sdk'
import { ServerMessage, SpotifyData } from '../types/websocket'
import logger from '../utils/logger'
import fs from 'fs'
import path from 'path'
import { broadcast } from '../utils/broadcast'

// Helper to safely parse JSON from error responses
function safeParseJSON(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return input
  }
}

// Type definitions
interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

interface SpotifyTokenPayload {
  provider: string
  sub: string
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  obtainedAt: number
}

interface TokenRecord {
  receivedAt: number
  payload: SpotifyTokenPayload
}

type SpotifyCommand =
  | 'PLAY'
  | 'NEXT'
  | 'PREVIOUS'
  | 'LOGIN'
  | 'TRANSFER_PLAYBACK'
  | 'SET_VOLUME'
  | 'PAUSE'

class SpotifyService {
  private static instance: SpotifyService

  private sdk: SpotifyApi | null = null
  private pollInterval: NodeJS.Timeout | null = null
  private tokenRefreshInterval: NodeJS.Timeout | null = null
  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null
  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
  }
  private tokenFile: string
  private currentToken: TokenRecord | null = null
  private refreshPromise: Promise<boolean> | null = null
  private clientId: string
  private clientSecret: string

  private constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || ''
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || ''
    this.tokenFile = path.join(process.cwd(), 'logs', 'spotify_tokens.json')
    this.loadTokens()

    if (this.clientId && this.clientSecret) {
      this.initializeSdk().catch((err) => {
        logger.error({ err }, 'Failed to initialize Spotify SDK on startup')
      })
      this.tokenRefreshInterval = setInterval(
        () => this.checkAndRefreshSdkToken(),
        1000 * 60 * 5 // Check every 5 minutes
      )
    } else {
      logger.warn(
        'Spotify Client ID or Secret not provided. Spotify service will be disabled.'
      )
    }
  }

  public static getInstance(): SpotifyService {
    if (!SpotifyService.instance) {
      SpotifyService.instance = new SpotifyService()
    }
    return SpotifyService.instance
  }

  private async initializeSdk() {
    const accessToken = await this.getValidAccessToken()
    if (accessToken) {
      const sdkToken = this.getSdkAccessToken()
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
    this.sdk = SpotifyApi.withAccessToken(this.clientId, accessToken)
  }

  private loadTokens() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, 'utf8')
        this.currentToken = JSON.parse(data) as TokenRecord
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to load Spotify tokens')
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.currentToken?.payload.refresh_token) {
      broadcast({ type: 'SPOTIFY_AUTH_ERROR', payload: 'Missing refresh token' })
      return false
    }

    try {
      const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.currentToken.payload.refresh_token,
        }).toString(),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        if (response.status === 401 || response.status === 403) {
          broadcast({ type: 'SPOTIFY_AUTH_ERROR', payload: 'Invalid refresh token' })
        }
        throw new Error(`HTTP ${response.status}: ${errorBody}`)
      }

      const data = (await response.json()) as SpotifyTokenResponse
      this.currentToken = {
        receivedAt: Date.now(),
        payload: {
          ...this.currentToken.payload,
          access_token: data.access_token,
          expires_in: data.expires_in,
          refresh_token:
            data.refresh_token ?? this.currentToken.payload.refresh_token,
          obtainedAt: Date.now(),
        },
      }
      fs.writeFileSync(
        this.tokenFile,
        JSON.stringify(this.currentToken, null, 2),
        'utf8'
      )
      return true
    } catch (err) {
      logger.error({ err }, 'Failed to refresh Spotify token')
      return false
    }
  }

  private async getValidAccessToken(): Promise<string | null> {
    this.loadTokens()
    if (!this.currentToken) return null

    const expiresAt =
      this.currentToken.payload.obtainedAt +
      this.currentToken.payload.expires_in * 1000

    if (Date.now() >= expiresAt - 60000) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshToken()
      }
      const success = await this.refreshPromise
      this.refreshPromise = null
      if (!success) return null
    }
    return this.currentToken.payload.access_token
  }

  private getSdkAccessToken(): AccessToken | null {
    if (!this.currentToken) return null
    return {
      access_token: this.currentToken.payload.access_token,
      token_type: 'Bearer',
      expires_in: this.currentToken.payload.expires_in,
      refresh_token: this.currentToken.payload.refresh_token,
      expires:
        this.currentToken.payload.obtainedAt +
        this.currentToken.payload.expires_in * 1000,
    }
  }

  private async checkAndRefreshSdkToken() {
    const newTokenString = await this.getValidAccessToken()
    if (newTokenString && this.sdk) {
      const sdkToken = this.getSdkAccessToken()
      if (sdkToken) {
        this.setupSdk(sdkToken)
      }
    }
  }

  public getState = (): SpotifyData => ({ ...this.state })
  public isReady = (): boolean => this.sdk !== null

  public setRefreshToken = (_token: string) => {
    logger.debug('Spotify Refresh Token signal received. Reloading SDK.')
    setTimeout(() => this.initializeSdk(), 1000)
  }

  public startPolling = () => {
    if (this.pollInterval) return
    const intervalMs = process.env.SPOTIFY_POLLING_INTERVAL_MS
      ? parseInt(process.env.SPOTIFY_POLLING_INTERVAL_MS, 10)
      : 3000
    this.pollInterval = setInterval(() => this.getCurrentlyPlaying(), intervalMs)
  }

  public stopPolling = () => {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  public cleanup = () => {
    this.stopPolling()
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval)
      this.tokenRefreshInterval = null
    }
  }

  public forcePollAndBroadcast = () => this.getCurrentlyPlaying()

  private getCurrentlyPlaying = async () => {
    if (!this.sdk) return

    try {
      const playbackState = await this.sdk.player.getCurrentlyPlayingTrack()
      if (!playbackState) {
        if (this.lastPlaybackState !== false) {
          this.lastPlaybackState = false
          this.state = {
            trackName: 'Nothing is currently playing.',
            artist: '',
            isPlaying: false,
          }
          broadcast({
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

      if (item?.id !== this.lastTrackId || isPlaying !== this.lastPlaybackState) {
        this.lastTrackId = item?.id || null
        this.lastPlaybackState = isPlaying
        this.state = {
          trackName: trackName,
          artist: artistName,
          isPlaying: isPlaying,
        }
        broadcast({
          type: 'SPOTIFY_UPDATE',
          payload: this.getState(),
        })
      }
    } catch (error) {
      const err = error as { status?: number; response?: { text: () => Promise<string> } }
      if (err?.status === 401 || err?.status === 403) {
        this.checkAndRefreshSdkToken()
      } else {
        this.logSpotifyCommandError('POLL', error)
      }
    }
  }

  public getAvailableDevices = async () => {
    if (!this.sdk) return []
    try {
      const response = await this.sdk.player.getAvailableDevices()
      return response.devices
    } catch (error) {
      this.logSpotifyCommandError('GET_DEVICES', error)
      return []
    }
  }

  public handleCommand = async (
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ) => {
    if (!this.sdk) return

    try {
      await this.executeSpotifyCommand(command, deviceId, volume, playlistUri)
      setTimeout(() => this.getCurrentlyPlaying(), 500)
    } catch (error) {
      this.logSpotifyCommandError(command, error)
    }
  }

  private executeSpotifyCommand = async (
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ) => {
    switch (command) {
      case 'PLAY':
        await this.sdk!.player.startResumePlayback(
          (deviceId || undefined) as unknown as string,
          playlistUri
        )
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
      default:
        logger.warn(`Unknown Spotify command: ${command}`)
    }
  }

  private async logSpotifyCommandError(
    command: SpotifyCommand | 'POLL' | 'GET_DEVICES',
    error: unknown
  ) {
    if (error instanceof SyntaxError) {
      logger.warn(
        `[SpotifyService] Command ${command} executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.`
      )
      return
    }

    const err = error as { response?: { text: () => Promise<string> } }
    if (err.response && typeof err.response.text === 'function') {
      try {
        const text = await err.response.text()
        const parsed = safeParseJSON(text)
        logger.error(
          { response: parsed },
          `Error executing Spotify command ${command}: Parsed response:`
        )
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
  }
}

export const spotifyService = SpotifyService.getInstance()

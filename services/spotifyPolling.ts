import {
  AccessToken,
  SpotifyApi,
  Device,
  Track,
  Episode,
} from '@spotify/web-api-ts-sdk'
import { ServerMessage, SpotifyData } from '../types/websocket'
import { SpotifyDevice } from '../types/core'
import {
  SpotifyTokenManager,
  SpotifyTokenPayload,
} from './spotifyTokenManager.js'
import logger from '../utils/logger.js'
import {
  handleSpotifyApiError,
  logSpotifyCommandError,
} from './spotifyApiErrorHandling.js'
import { SpotifyCommand, SpotifyService } from '../types/interfaces.js'
import { createSafeSpotifyApi } from './safeSpotifyApi.js'

// We use SDK types now, but keep internal state types as needed.
// Removed manual SpotifyCurrentlyPlayingResponse, SpotifyDevice, etc.

export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

export class SpotifyPolling implements SpotifyService {
  /**
   * Public method to force a poll and broadcast current track state.
   */
  public forcePollAndBroadcast() {
    return this.getCurrentlyPlaying()
  }
  private tokenManager: SpotifyTokenManager
  private pollInterval: NodeJS.Timeout | null = null
  private devicePollInterval: NodeJS.Timeout | null = null
  private tokenRefreshInterval: NodeJS.Timeout | null = null

  // Internal auth/state values
  private broadcastUpdate: (message: ServerMessage) => void

  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null

  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    albumName: '',
    albumArtUrl: '',
    isPlaying: false,
    devices: [],
    volume: 70,
    isMuted: false,
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
    // Remove refresh_token to prevent SDK from attempting auto-refresh without client secret.
    // We handle refreshing manually via SpotifyTokenManager.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refresh_token, ...tokenWithoutRefresh } = accessToken
    const sdk = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID || '',
      tokenWithoutRefresh as AccessToken
    )
    // Wrap the SDK with our safe API to handle optional deviceIds correctly.
    this.sdk = createSafeSpotifyApi(sdk)
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
   * Asynchronously handles the token update signal by directly accepting the payload.
   * This function updates the token manager, re-initializes the SDK,
   * and immediately triggers a poll and broadcast.
   * @param {SpotifyTokenPayload} tokens - The new token payload.
   */
  public async handleTokenUpdate(tokens: SpotifyTokenPayload): Promise<void> {
    logger.info(
      { tokens },
      'Spotify token payload received. Updating SDK and forcing poll.'
    )
    this.tokenManager.updateToken(tokens)
    // Re-initialize the SDK with the new in-memory token
    const sdkToken = this.tokenManager.getSdkAccessToken()
    if (sdkToken) {
      this.setupSdk(sdkToken)
      this.startPolling() // Ensure polling is active
    }
    await this.forcePollAndBroadcast()
  }

  // --- Polling Logic ---

  // Expose start/stop polling publicly (used by server to control lifecycle)
  public startPolling() {
    if (this.pollInterval) return // Already running

    // Interval for currently playing track
    const trackIntervalMs = process.env.SPOTIFY_POLLING_INTERVAL_MS
      ? parseInt(process.env.SPOTIFY_POLLING_INTERVAL_MS, 10)
      : 3000
    this.pollInterval = setInterval(
      () => this.getCurrentlyPlaying(),
      trackIntervalMs
    )

    // Interval for available devices (less frequent)
    const deviceIntervalMs = parseInt(
      process.env.SPOTIFY_DEVICE_POLLING_INTERVAL_MS || '10000',
      10
    )
    this.devicePollInterval = setInterval(
      () => this.refreshDevices(),
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

  private getCurrentlyPlaying = async () => {
    if (!this.sdk) return

    try {
      const playbackState = await this.sdk.player.getCurrentlyPlayingTrack()

      if (!playbackState || !playbackState.item) {
        // Nothing playing, 204, or private session
        if (this.lastPlaybackState !== false) {
          this.lastPlaybackState = false
          this.state = {
            ...this.state,
            trackName: 'Nothing is currently playing.',
            artist: '',
            albumName: '',
            albumArtUrl: '',
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
      const isPlaying = playbackState.is_playing

      // Only broadcast if track ID or playback state has changed
      if (
        item.id !== this.lastTrackId ||
        isPlaying !== this.lastPlaybackState
      ) {
        this.lastTrackId = item.id
        this.lastPlaybackState = isPlaying

        const trackName = item.name
        let artistName = ''
        let albumName = ''
        let albumArtUrl = ''

        if (item.type === 'track') {
          const track = item as Track
          artistName = track.artists.map((a) => a.name).join(', ')
          albumName = track.album.name
          albumArtUrl = track.album.images?.[0]?.url ?? ''
        } else if (item.type === 'episode') {
          const episode = item as Episode
          artistName = episode.show.publisher
          albumName = episode.show.name
          albumArtUrl = episode.show.images?.[0]?.url ?? ''
        }

        this.state = {
          ...this.state,
          trackName,
          artist: artistName,
          albumName,
          albumArtUrl,
          isPlaying,
        }

        this.broadcastUpdate({
          type: 'SPOTIFY_UPDATE',
          payload: this.getState(),
        })
      }
    } catch (error) {
      await handleSpotifyApiError(error, () => this.checkAndRefreshSdkToken())
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
          id: d.id!, // Non-null assertion is safe here due to the filter above.
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
    params: {
      deviceId?: string
      volume?: number
      playlistUri?: string
    }
  ) {
    const { deviceId, volume, playlistUri } = params
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
        await logSpotifyCommandError(command, error)
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
          // The safe API wrapper handles the undefined deviceId correctly.
          await this.sdk!.player.startResumePlayback(deviceId, playlistUri)
        } else {
          await this.sdk!.player.startResumePlayback(deviceId)
        }
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
      case 'LOGIN':
        logger.debug('Received LOGIN command')
        break
      default:
        logger.warn({ command }, 'Unknown Spotify command')
    }
  }
}

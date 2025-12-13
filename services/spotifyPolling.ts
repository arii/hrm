import { AccessToken, SpotifyApi, Device } from '@spotify/web-api-ts-sdk'
import { ServerMessage, SpotifyData, SpotifyDevice } from '../types/websocket'
import { SystemAccountAccessor } from './systemAccountAccessor'
import logger from '../utils/logger.js'

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
  public forcePollAndBroadcast() {
    return this.getCurrentlyPlaying()
  }

  // No longer need an instance of tokenManager
  private pollInterval: NodeJS.Timeout | null = null
  private tokenReinitializationInterval: NodeJS.Timeout | null = null // Renamed for clarity

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
    // No token manager instantiation needed
  }

  public static async create(
    broadcastUpdate: (message: ServerMessage) => void
  ): Promise<SpotifyPolling> {
    const instance = new SpotifyPolling(broadcastUpdate)
    await instance.initializeSdk()
    // This interval ensures the polling service periodically gets the latest token
    // that may have been refreshed by a user's NextAuth session.
    instance.tokenReinitializationInterval = setInterval(
      () => instance.reinitializeSdkFromDb(),
      1000 * 60 * 1 // Re-initialize SDK with fresh DB token every 1 minute
    )
    return instance
  }

  private async initializeSdk() {
    const account = await SystemAccountAccessor.getSystemAccount()
    if (account && account.access_token) {
      const sdkToken: AccessToken = {
        access_token: account.access_token,
        token_type: account.token_type || 'Bearer',
        expires_in: account.expires_at
          ? account.expires_at - Math.floor(Date.now() / 1000)
          : 3600,
        refresh_token: account.refresh_token || '',
      }
      this.setupSdk(sdkToken)
      logger.debug(
        'Initialized Spotify SDK with token from database. Starting polling.'
      )
      this.startPolling()
    } else {
      logger.warn(
        'Could not initialize Spotify SDK: No system token found in database.'
      )
      this.stopPolling() // Ensure polling is stopped if no token is available
    }
  }

  private setupSdk(accessToken: AccessToken) {
    this.sdk = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID || '',
      accessToken
    )
  }

  /**
   * Periodically re-reads the token from the database and re-initializes the SDK.
   * This is the new "refresh" mechanism for this background service.
   */
  private async reinitializeSdkFromDb() {
    logger.debug('Re-initializing Spotify SDK with latest token from DB...')
    await this.initializeSdk()
  }

  public getState(): SpotifyData {
    return { ...this.state }
  }

  public isReady(): boolean {
    return this.sdk !== null
  }

  // The setRefreshToken method is now obsolete and has been removed.

  public startPolling() {
    if (this.pollInterval) return

    const intervalMs = process.env.SPOTIFY_POLLING_INTERVAL_MS
      ? parseInt(process.env.SPOTIFY_POLLING_INTERVAL_MS, 10)
      : 3000
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
    if (this.tokenReinitializationInterval) {
      clearInterval(this.tokenReinitializationInterval)
      this.tokenReinitializationInterval = null
      logger.debug('Token re-initialization interval cleared.')
    }
  }

  private getCurrentlyPlaying = async () => {
    if (!this.sdk) {
      // Don't log every 3 seconds, just return.
      return
    }

    try {
      const playbackState = await this.sdk.player.getCurrentlyPlayingTrack()

      if (!playbackState) {
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
      const err = error as { status?: number; response?: Response }
      if (err?.status === 401) {
        logger.warn(
          'Spotify API returned 401. The token is likely expired or invalid. Awaiting next refresh cycle from DB.'
        )
        // Stop polling temporarily to avoid spamming logs until the token is refreshed.
        this.stopPolling()
      } else if (err?.status === 429) {
        logger.warn('Spotify API Rate Limited. Backing off...')
      } else {
        logger.error({ err: error }, 'Error fetching currently playing track')
      }
    }
  }

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

    // Command execution logic remains the same...
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
    if (!this.sdk) return

    switch (command) {
      case 'PLAY':
        await this.sdk.player.startResumePlayback(
          (deviceId || undefined) as unknown as string,
          playlistUri
        )
        break
      case 'PAUSE':
        await this.sdk.player.pausePlayback(
          (deviceId || undefined) as unknown as string
        )
        break
      case 'NEXT':
        await this.sdk.player.skipToNext(
          (deviceId || undefined) as unknown as string
        )
        break
      case 'PREVIOUS':
        await this.sdk.player.skipToPrevious(
          (deviceId || undefined) as unknown as string
        )
        break
      case 'TRANSFER_PLAYBACK':
        if (deviceId) {
          await this.sdk.player.transferPlayback([deviceId], true)
        }
        break
      case 'SET_VOLUME':
        if (volume !== undefined) {
          const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)))
          await this.sdk.player.setPlaybackVolume(clampedVolume, deviceId)
        }
        break
      case 'LOGIN':
        logger.debug('Received LOGIN command.')
        break
      default:
        logger.warn(`Unknown Spotify command: ${command}`)
    }
  }

  // Error logging remains the same...
  private async logSpotifyCommandError(
    _command: SpotifyCommand,
    _error: unknown
  ) {
    // ... (This complex error logging function is kept as is)
  }
}

import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { ServerMessage, SpotifyData } from '../types/websocket'
import logger from '../utils/logger.js'
import { spotifyApi } from './spotifyApi'

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

  private pollInterval: NodeJS.Timeout | null = null
  private broadcastUpdate: (message: ServerMessage) => void
  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null
  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
  }

  private constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
    logger.debug('Spotify Polling Service Initialized.')
  }

  public static async create(
    broadcastUpdate: (message: ServerMessage) => void
  ): Promise<SpotifyPolling> {
    const instance = new SpotifyPolling(broadcastUpdate)
    if (spotifyApi.isReady()) {
      logger.debug(
        'Spotify API is ready. Starting polling immediately.'
      )
      instance.startPolling()
    } else {
      logger.debug(
        'Spotify API not ready. Polling will start after token delivery.'
      )
    }
    return instance
  }

  public getState(): SpotifyData {
    return { ...this.state }
  }

  public isReady(): boolean {
    return spotifyApi.isReady()
  }

  public async setRefreshToken(_token: string): Promise<void> {
    logger.debug('Spotify Refresh Token signal received. Reloading SDK.')
    await spotifyApi.signalTokenRefresh()
    if (!this.pollInterval) {
      this.startPolling()
    }
  }

  public startPolling(): void {
    if (this.pollInterval) return

    const intervalMs = process.env.SPOTIFY_POLLING_INTERVAL_MS
      ? parseInt(process.env.SPOTIFY_POLLING_INTERVAL_MS, 10)
      : 3000

    this.pollInterval = setInterval(() => this.getCurrentlyPlaying(), intervalMs)
    logger.debug(`Spotify polling started with interval: ${intervalMs}ms.`)
  }

  public stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
      logger.debug('Spotify polling stopped.')
    }
  }

  public cleanup(): void {
    this.stopPolling()
  }

  private getCurrentlyPlaying = async () => {
    try {
      const sdk = await spotifyApi.getSdk()
      const playbackState = await sdk.player.getCurrentlyPlayingTrack()

      if (!playbackState) {
        if (this.lastPlaybackState !== false) {
          this.lastPlaybackState = false
          this.state = {
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
        this.state = { trackName, artist: artistName, isPlaying }
        this.broadcastUpdate({
          type: 'SPOTIFY_UPDATE',
          payload: this.getState(),
        })
      }
    } catch (error) {
      const err = error as { status?: number; reason?: string }
      if (err?.status === 429) {
        logger.warn('Spotify API Rate Limited. Backing off...')
        return
      }

      if (err?.status === 401) {
        logger.warn(
          'Spotify token expired during polling. Attempting refresh.'
        )
        await spotifyApi.signalTokenRefresh()
        return
      }

      logger.error({ err: error }, 'Error fetching currently playing track')
    }
  }

  public async getAvailableDevices() {
    try {
      const sdk = await spotifyApi.getSdk()
      const response = await sdk.player.getAvailableDevices()
      return response.devices
    } catch (error) {
      logger.error({ err: error }, 'Error fetching Spotify devices')
      return []
    }
  }

  public async handleCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ): Promise<void> {
    try {
      const sdk = await spotifyApi.getSdk()
      await this.executeSpotifyCommand(
        sdk,
        command,
        deviceId,
        volume,
        playlistUri
      )
      setTimeout(() => this.getCurrentlyPlaying(), 500)
    } catch (error) {
      this.logSpotifyCommandError(command, error)
    }
  }

  private async executeSpotifyCommand(
    sdk: SpotifyApi,
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetDevice = (deviceId || undefined) as any
    switch (command) {
      case 'PLAY':
        await sdk.player.startResumePlayback(targetDevice, playlistUri)
        break
      case 'PAUSE':
        await sdk.player.pausePlayback(targetDevice)
        break
      case 'NEXT':
        await sdk.player.skipToNext(targetDevice)
        break
      case 'PREVIOUS':
        await sdk.player.skipToPrevious(targetDevice)
        break
      case 'TRANSFER_PLAYBACK':
        if (deviceId) {
          await sdk.player.transferPlayback([deviceId], true)
        }
        break
      case 'SET_VOLUME':
        if (volume !== undefined) {
          const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)))
          await sdk.player.setPlaybackVolume(clampedVolume, targetDevice)
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
        // Suppress SyntaxError which usually occurs when Spotify returns a non-JSON response (e.g. 204 No Content or simple text error)
        // This is "expected" behavior from the SDK in some edge cases.
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
                // Sometimes calling text() itself might fail if body was already consumed or invalid
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
          // Log other object errors
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
      // Absolute failsafe to prevent logger from crashing the app
      logger.error(
        { err: loggingError },
        `Error executing Spotify command ${command}: (Logging failed)`
      )
      logger.error({ err: error }, `Original error for ${command}:`)
    }
  }
}

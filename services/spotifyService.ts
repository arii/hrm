import {
  AccessToken,
  SpotifyApi,
  Track,
  Episode,
  Device,
} from '@spotify/web-api-ts-sdk'
import { ServerMessage, SpotifyData } from '../types/websocket'
import {
  SpotifyCommandParameters,
  SpotifyCommand,
  SpotifyDevice,
} from '../types/core'
import {
  SpotifyTokenManager,
  SpotifyTokenPayload,
} from './spotifyTokenManager.js'
import logger from '../utils/logger.server.js'
import { SpotifyService as ISpotifyService } from '../types/interfaces.js'
import { env } from '../lib/env.js'

// --- Utility Functions ---

// Utility: Safely parse JSON, fallback to text
function safeParseJSON(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return input // Return raw text if not JSON
  }
}

function isEmptyResponseError(error: unknown): boolean {
  if (!(error instanceof SyntaxError)) {
    return false
  }
  return /unexpected end of/i.test(error.message)
}

const NOT_PLAYING_MESSAGE = 'Nothing is currently playing.'

interface ParsedPlaybackState {
  trackId: string | null
  trackName: string
  artist: string
  albumName: string
  albumArtUrl: string
  isPlaying: boolean
  is_playing: boolean
  volume_percent: number
  progress_ms: number
}

export class SpotifyService implements ISpotifyService {
  private tokenManager: SpotifyTokenManager
  private pollInterval: NodeJS.Timeout | null = null
  private devicePollInterval: NodeJS.Timeout | null = null
  private tokenRefreshInterval: NodeJS.Timeout | null = null

  private readonly broadcastUpdate: (message: ServerMessage) => void

  private state: SpotifyData = {
    devices: [],
    playback: {
      track: {
        id: null,
        name: 'Awaiting Login...',
        artist: '',
        albumName: '',
        albumArtUrl: '',
      },
      is_playing: false,
      isMuted: false,
      volume_percent: 70,
      progress_ms: 0,
    },
  }

  private sdk: SpotifyApi | null = null

  private constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
    logger.debug('Spotify Service Initialized.')

    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
      throw new Error('Spotify client ID or secret not configured.')
    }

    this.tokenManager = new SpotifyTokenManager(
      env.SPOTIFY_CLIENT_ID,
      env.SPOTIFY_CLIENT_SECRET
    )
  }

  public static async create(
    broadcastUpdate: (message: ServerMessage) => void
  ): Promise<SpotifyService> {
    const instance = new SpotifyService(broadcastUpdate)
    await instance.initializeSdk()
    instance.tokenRefreshInterval = setInterval(
      () => instance.checkAndRefreshSdkToken(),
      1000 * 60 * 5
    )
    return instance
  }

  // --- Public Interface Methods ---

  public getState(): SpotifyData {
    return { ...this.state }
  }

  public isReady(): boolean {
    return this.sdk !== null
  }

  public startPolling() {
    if (this.pollInterval) return
    if (!this.isReady()) {
      logger.warn('Cannot start polling: Spotify service is not ready.')
      return
    }

    const trackIntervalMs = env.SPOTIFY_POLLING_INTERVAL_MS
    this.pollInterval = setInterval(
      () => this.getCurrentlyPlaying(),
      trackIntervalMs
    )

    const deviceIntervalMs = env.SPOTIFY_DEVICE_POLLING_INTERVAL_MS
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

  public async handleTokenUpdate(tokens: SpotifyTokenPayload): Promise<void> {
    logger.info(
      { tokens },
      'Spotify token payload received. Updating SDK and forcing poll.'
    )
    this.tokenManager.updateToken(tokens)
    const sdkToken = this.tokenManager.getSdkAccessToken()
    if (sdkToken) {
      this.setupSdk(sdkToken)
      this.startPolling()
    }
    await this.forcePollAndBroadcast()
  }

  public forcePollAndBroadcast() {
    return this.getCurrentlyPlaying()
  }

  public async handleCommand(
    command: SpotifyCommand,
    params: SpotifyCommandParameters
  ): Promise<void> {
    if (!this.isReady()) {
      logger.warn('Spotify service not ready, command ignored.', { command })
      return
    }

    try {
      if (command === 'GET_DEVICES') {
        await this.refreshDevices()
        return
      }

      if (command === 'LOGIN') {
        logger.debug('Received LOGIN command')
        return
      }

      // All other commands are player-related
      await this.executeSpotifyCommand(command, params)

      // Slight delay to allow Spotify API to update before we re-poll
      setTimeout(() => this.getCurrentlyPlaying(), 500)
    } catch (error) {
      await this.logSpotifyCommandError(command, error)
    }
  }

  // --- Internal Methods ---

  private async initializeSdk() {
    const token = await this.tokenManager.getValidAccessToken()
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refresh_token: _, ...tokenWithoutRefresh } = accessToken
    if (!env.SPOTIFY_CLIENT_ID) {
      logger.error('Spotify client ID not found, cannot initialize SDK.')
      return
    }
    const sdk = SpotifyApi.withAccessToken(
      env.SPOTIFY_CLIENT_ID,
      tokenWithoutRefresh as AccessToken
    )
    this.sdk = sdk
  }

  private async checkAndRefreshSdkToken() {
    const newTokenString = await this.tokenManager.getValidAccessToken()
    if (newTokenString && this.sdk) {
      const sdkToken = this.tokenManager.getSdkAccessToken()
      if (sdkToken) {
        this.setupSdk(sdkToken)
      }
    }
  }

  private setState(
    update: SpotifyData | ((prevState: SpotifyData) => SpotifyData)
  ) {
    if (typeof update === 'function') {
      this.state = update(this.state)
    } else {
      this.state = update
    }
  }

  private getCurrentlyPlaying = async () => {
    try {
      if (!this.sdk) {
        logger.debug('Spotify SDK not initialized, skipping poll')
        return
      }

      await this.refreshPlaybackState()
    } catch (error) {
      await this.handleSpotifyApiError(error, () =>
        this.checkAndRefreshSdkToken()
      )
    }
  }

  // --- Device Management Logic ---

  private async refreshDevices(): Promise<void> {
    if (!this.sdk) return
    try {
      const response = await this.sdk.player.getAvailableDevices()
      const validDevices: SpotifyDevice[] = (response.devices || [])
        .filter((d: Device): d is Device & { id: string } => d.id !== null)
        .map((d) => ({
          id: d.id,
          is_active: d.is_active,
          is_private_session: d.is_private_session,
          is_restricted: d.is_restricted,
          name: d.name,
          type: d.type,
          volume_percent: d.volume_percent ?? 0,
        }))

      this.setState((prevState) => ({ ...prevState, devices: validDevices }))
      this.broadcastUpdate({
        type: 'SPOTIFY_UPDATE',
        payload: this.getState(),
      })
      logger.debug({ count: validDevices.length }, 'Devices refreshed')
    } catch (error) {
      logger.error({ err: error }, 'Error fetching Spotify devices')
    }
  }

  // --- Player Management Logic ---

  private async refreshPlaybackState(): Promise<void> {
    const playbackState = await this.fetchPlaybackState()
    const currentState = this.getState()

    if (!playbackState) {
      if (
        currentState.playback.is_playing ||
        currentState.playback.track.name !== NOT_PLAYING_MESSAGE
      ) {
        this.setState((prev: SpotifyData) => ({
          ...prev,
          playback: {
            ...prev.playback,
            track: {
              id: null,
              name: NOT_PLAYING_MESSAGE,
              artist: '',
              albumName: '',
              albumArtUrl: '',
            },
            is_playing: false,
          },
        }))
        this.broadcastUpdate({
          type: 'SPOTIFY_UPDATE',
          payload: this.getState(),
        })
      }
      return
    }

    const {
      trackId,
      trackName,
      artist,
      albumName,
      albumArtUrl,
      is_playing,
      volume_percent,
      progress_ms,
    } = playbackState

    if (
      trackId !== currentState.playback.track.id ||
      is_playing !== currentState.playback.is_playing ||
      volume_percent !== currentState.playback.volume_percent
    ) {
      this.setState((prev: SpotifyData) => ({
        ...prev,
        playback: {
          track: {
            id: trackId,
            name: trackName,
            artist,
            albumName,
            albumArtUrl,
          },
          is_playing,
          volume_percent,
          isMuted: volume_percent === 0,
          progress_ms,
        },
      }))

      this.broadcastUpdate({
        type: 'SPOTIFY_UPDATE',
        payload: this.getState(),
      })
    }
  }

  private async fetchPlaybackState(): Promise<ParsedPlaybackState | null> {
    if (!this.sdk) return null
    const playbackState = await this.sdk.player.getPlaybackState()

    if (!playbackState || !playbackState.item) {
      return null
    }

    const item = playbackState.item
    const isPlaying = playbackState.is_playing
    const volume_percent = playbackState.device.volume_percent ?? 0
    const progress_ms = playbackState.progress_ms

    const trackId = item.id
    const trackName = item.name
    let artist = ''
    let albumName = ''
    let albumArtUrl = ''

    if (item.type === 'track') {
      const track = item as Track
      artist = track.artists.map((a) => a.name).join(', ')
      albumName = track.album.name
      albumArtUrl = track.album.images?.[0]?.url ?? ''
    } else if (item.type === 'episode') {
      const episode = item as Episode
      artist = episode.show.publisher
      albumName = episode.show.name
      albumArtUrl = episode.show.images?.[0]?.url ?? ''
    }

    return {
      trackId,
      trackName,
      artist,
      albumName,
      albumArtUrl,
      isPlaying,
      is_playing: isPlaying,
      volume_percent,
      progress_ms,
    }
  }

  private async executeSpotifyCommand(
    command: SpotifyCommand,
    params: SpotifyCommandParameters
  ) {
    const { deviceId, volume, playlistUri, contextUri, uri } = params
    const effectiveContextUri = contextUri || playlistUri
    const sdk = this.sdk
    if (!sdk) return

    switch (command) {
      case 'PLAY':
        await this.executeSdkCommand(
          command,
          () => {
            if (uri) {
              return sdk.player.startResumePlayback(
                deviceId as string,
                undefined,
                [uri]
              )
            }
            if (effectiveContextUri) {
              return sdk.player.startResumePlayback(
                deviceId as string,
                effectiveContextUri
              )
            }
            return sdk.player.startResumePlayback(deviceId as string)
          },
          { deviceId, contextUri: effectiveContextUri, uri }
        )
        break
      case 'PAUSE':
        await this.executeSdkCommand(
          command,
          () => sdk.player.pausePlayback(deviceId as string),
          { deviceId }
        )
        break
      case 'NEXT':
        await this.executeSdkCommand(
          command,
          () => sdk.player.skipToNext(deviceId as string),
          { deviceId }
        )
        break
      case 'PREVIOUS':
        await this.executeSdkCommand(
          command,
          () => sdk.player.skipToPrevious(deviceId as string),
          { deviceId }
        )
        break
      case 'TRANSFER_PLAYBACK':
        if (deviceId) {
          await this.executeSdkCommand(
            command,
            () => sdk.player.transferPlayback([deviceId as string], true),
            { deviceId }
          )
        }
        break
      case 'SET_VOLUME':
        if (volume !== undefined) {
          const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)))
          await this.executeSdkCommand(
            command,
            () =>
              sdk.player.setPlaybackVolume(clampedVolume, deviceId as string),
            { deviceId, volume: clampedVolume }
          )
          this.setState((prevState: SpotifyData) => ({
            ...prevState,
            playback: {
              ...prevState.playback,
              volume_percent: clampedVolume,
              isMuted: clampedVolume === 0,
            },
          }))
          this.broadcastUpdate({
            type: 'SPOTIFY_UPDATE',
            payload: this.getState(),
          })
        }
        break
    }
  }

  private async executeSdkCommand(
    commandName: string,
    apiCall: () => Promise<unknown>,
    logContext: Record<string, string | number | undefined> = {}
  ): Promise<void> {
    try {
      await apiCall()
    } catch (error) {
      if (isEmptyResponseError(error)) {
        logger.debug(
          { command: commandName, ...logContext },
          'Spotify command successful (204 No Content)'
        )
        return
      }
      throw error
    }
  }

  // --- Error Handling Utilities ---

  private async logSpotifyCommandError(
    command: string,
    error: unknown
  ): Promise<void> {
    try {
      const errObj = error as { message?: string; status?: number }

      // Check for "No active device" error (404)
      if (
        (errObj?.message &&
          (errObj.message.includes('NO_ACTIVE_DEVICE') ||
            errObj.message.includes('Device not found'))) ||
        errObj?.status === 404
      ) {
        logger.warn(
          { command },
          'Spotify command failed: No active device found. Playback cannot be controlled.'
        )
        return
      }

      if (error instanceof SyntaxError) {
        logger.warn(
          { command },
          'Command executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.'
        )
        return
      }

      // Log error with response body if available
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (
          error as { response?: { text?: () => Promise<string> } }
        ).response
        if (response && typeof response.text === 'function') {
          try {
            const text = await response.text()
            const parsed = safeParseJSON(text)
            logger.error(
              { command, response: parsed },
              'Error executing Spotify command'
            )
            return
          } catch (e) {
            logger.error(
              { command, err: e },
              'Could not read response body for failed Spotify command'
            )
            return
          }
        }
      }

      // Default error logging
      logger.error({ command, err: error }, 'Error executing Spotify command')
    } catch (loggingError) {
      logger.error(
        { command, err: loggingError },
        'Error in logSpotifyCommandError'
      )
      logger.error({ command, originalError: error }, 'Original error')
    }
  }

  private async handleSpotifyApiError(
    error: unknown,
    onTokenExpired: () => void
  ): Promise<boolean> {
    const err = error as {
      status?: number
      response?: { text: () => Promise<string> }
    }

    if (err?.status === 429) {
      logger.warn('Spotify API Rate Limited. Backing off...')
      return true // Handled
    }

    if (err?.status === 401) {
      logger.warn('Spotify token expired during polling. Attempting refresh.')
      onTokenExpired()
      return true // Handled
    }

    // Check for network errors
    const errMsg = (error as { message?: string })?.message || ''
    if (
      errMsg.includes('fetch failed') ||
      errMsg.includes('EAI_AGAIN') ||
      errMsg.includes('ENETUNREACH') ||
      errMsg.includes('ECONNREFUSED')
    ) {
      logger.warn(
        { err: error },
        `Temporary network connectivity issue during Spotify polling: ${errMsg} (suppressed)`
      )
      return true // Handled (suppressed)
    }

    // For other errors, log the response if available
    if (err?.response && typeof err.response.text === 'function') {
      const text = await err.response.text()
      const parsed = safeParseJSON(text)
      logger.error(
        { response: parsed },
        'Unhandled Spotify API error during polling'
      )
    } else {
      logger.error({ err: error }, 'Error fetching currently playing track')
    }
    return false // Not a specifically handled API error
  }

  // --- Test Helpers ---
  public _test_ =
    process.env.NODE_ENV === 'test'
      ? {
          setState: this.setState.bind(this),
          setSdk: (sdk: SpotifyApi | null) => {
            this.sdk = sdk
          },
          getPollInterval: () => this.pollInterval,
          getTokenRefreshInterval: () => this.tokenRefreshInterval,
          setPollInterval: (interval: NodeJS.Timeout | null) => {
            this.pollInterval = interval
          },
          setTokenRefreshInterval: (interval: NodeJS.Timeout | null) => {
            this.tokenRefreshInterval = interval
          },
          getCurrentlyPlaying: this.getCurrentlyPlaying.bind(this),
        }
      : undefined
}

// File: services/spotifyPolling.ts
/**
 * Spotify Polling Service: Periodically fetches the current playback state from the
 * Spotify API and broadcasts it to all connected clients.
 */
import { SpotifyApi, Track } from '@spotify/web-api-ts-sdk'
import {
  SpotifyData,
  SpotifyDevice,
  BroadcastMessage,
} from '../types/websocket.js'
import { SpotifyTokenManager } from './spotifyTokenManager.js'

const POLLING_INTERVAL = 2000 // 2 seconds

// Singleton instance of the SDK
let sdk: SpotifyApi | null = null

// Type guard to check if an item is a Track
function isTrack(item: any): item is Track {
  return item && item.type === 'track'
}

export class SpotifyPolling {
  private broadcast: (message: BroadcastMessage) => void
  private tokenManager: SpotifyTokenManager
  private pollingInterval: NodeJS.Timeout | null = null
  private currentTrackUri: string | null = null
  private currentState: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
    devices: [],
  }

  // Private constructor to enforce singleton pattern via static create method
  private constructor(
    broadcast: (message: BroadcastMessage) => void,
    tokenManager: SpotifyTokenManager
  ) {
    this.broadcast = broadcast
    this.tokenManager = tokenManager
    this.initializeSdk()
  }

  /**
   * Asynchronously creates and initializes an instance of the SpotifyPolling service.
   */
  public static async create(
    broadcast: (message: BroadcastMessage) => void
  ): Promise<SpotifyPolling> {
    const tokenManager = new SpotifyTokenManager()
    const instance = new SpotifyPolling(broadcast, tokenManager)
    instance.startPolling()
    return instance
  }

  /**
   * Initializes the Spotify SDK with a valid access token.
   */
  private async initializeSdk() {
    try {
      const token = this.tokenManager.getSdkAccessToken()
      if (token) {
        console.log('[SpotifyPolling] Initializing SDK with new token.')
        sdk = SpotifyApi.withAccessToken('CLIENT_ID', token) // CLIENT_ID is a placeholder
        this.broadcast({
          type: 'SPOTIFY_SERVICE_INIT_UPDATE',
          payload: true,
        })
      } else {
        console.log(
          '[SpotifyPolling] No valid token available for SDK initialization.'
        )
        sdk = null
      }
    } catch (error) {
      console.error('Error initializing Spotify SDK:', error)
      sdk = null
    }
  }

  /**
   * Starts the polling loop to fetch playback state.
   */
  public startPolling() {
    if (this.pollingInterval) {
      console.log('[SpotifyPolling] Polling already in progress.')
      return
    }
    console.log('[SpotifyPolling] Starting polling...')
    this.pollingInterval = setInterval(
      () => this.pollPlaybackState(),
      POLLING_INTERVAL
    )
  }

  /**
   * Stops the polling loop.
   */
  public stopPolling() {
    if (this.pollingInterval) {
      console.log('[SpotifyPolling] Stopping polling.')
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  /**
   * Cleans up resources, like stopping the token polling.
   */
  public cleanup() {
    this.stopPolling()
    console.log('[SpotifyPolling] Cleanup complete.')
  }

  /**
   * Fetches the current playback state and broadcasts it if it has changed.
   */
  private async pollPlaybackState() {
    if (!sdk) {
      // console.log('[SpotifyPolling] SDK not initialized, skipping poll.')
      return
    }

    try {
      const state = await sdk.player.getCurrentlyPlayingTrack()
      const devices = await sdk.player.getAvailableDevices()

      let newState: SpotifyData

      if (state && state.item && isTrack(state.item)) {
        const newTrackUri = state.item.uri
        if (
          this.currentTrackUri !== newTrackUri ||
          this.currentState.isPlaying !== state.is_playing
        ) {
          this.currentTrackUri = newTrackUri
          console.log(`[Spotify] Now Playing: ${state.item.name}`)
        }

        newState = {
          trackName: state.item.name,
          artist: state.item.artists.map((a) => a.name).join(', '),
          isPlaying: state.is_playing,
          devices: devices.devices as SpotifyDevice[],
        }
      } else {
        newState = {
          trackName: 'No Active Playback',
          artist: '',
          isPlaying: false,
          devices: devices.devices as SpotifyDevice[],
        }
      }

      // Deep comparison to avoid unnecessary broadcasts
      if (JSON.stringify(this.currentState) !== JSON.stringify(newState)) {
        this.currentState = newState
        this.broadcast({ type: 'SPOTIFY_UPDATE', payload: this.currentState })
      }
    } catch (error) {
      console.error('[SpotifyPolling] Error polling playback state:', error)
    }
  }

  public getState(): SpotifyData {
    return this.currentState
  }

  public isReady(): boolean {
    return sdk !== null
  }

  /**
   * Handles incoming commands to control Spotify playback.
   */
  public async handleCommand(
    command: string,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ) {
    if (!sdk) {
      console.warn(
        `[Spotify] Command '${command}' received but SDK not initialized.`
      )
      return
    }

    try {
      switch (command) {
        case 'PLAY':
          await sdk.player.startResumePlayback(
            deviceId ?? undefined,
            undefined,
            playlistUri ? [playlistUri] : undefined
          )
          break
        case 'PAUSE':
          await sdk.player.pausePlayback(deviceId)
          break
        case 'NEXT':
          await sdk.player.skipToNext(deviceId)
          break
        case 'PREVIOUS':
          await sdk.player.skipToPrevious(deviceId)
          break
        case 'TRANSFER_PLAYBACK':
          if (deviceId) {
            await sdk.player.transferPlayback([deviceId], true)
          }
          break
        case 'SET_VOLUME':
          if (volume !== undefined) {
            await sdk.player.setPlaybackVolume(volume, {
              device_id: deviceId,
            })
          }
          break
        case 'GET_DEVICES':
          // The regular poll already gets devices, but we can force a poll
          await this.forcePollAndBroadcast()
          break
        default:
          console.warn(`[Spotify] Unknown command: ${command}`)
      }
    } catch (error) {
      console.error(`[Spotify] Error executing command '${command}':`, error)
    }
  }

  /**
   * Sets a new refresh token and re-initializes the SDK.
   */
  public async setRefreshToken(_token: string) {
    console.log('[SpotifyPolling] Setting new refresh token.')
    await this.initializeSdk()
  }

  /**
   * Forces an immediate poll and broadcast, useful after commands.
   */
  public async forcePollAndBroadcast() {
    console.log('[SpotifyPolling] Forcing immediate poll and broadcast.')
    // If the SDK isn't ready, try to initialize it now (e.g., after a token was just delivered)
    if (!sdk) {
      console.log(
        '[SpotifyPolling] SDK not ready, attempting to initialize before forced poll.'
      )
      await this.initializeSdk()
    }
    await this.pollPlaybackState()
  }
}

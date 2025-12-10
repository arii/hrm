import { ServerMessage, SpotifyData, SpotifyDevice } from '../types/websocket'
import { spotifyClient } from './spotifyClient' //
import logger from '../utils/logger'
import { Device } from '@spotify/web-api-ts-sdk'

// Types for internal state
type SpotifyCommand = 'PLAY' | 'NEXT' | 'PREVIOUS' | 'LOGIN' | 'TRANSFER_PLAYBACK' | 'SET_VOLUME' | 'PAUSE' | 'GET_DEVICES'

export class SpotifyPolling {
  private pollInterval: NodeJS.Timeout | null = null
  private broadcastUpdate: (message: ServerMessage) => void
  private lastTrackId: string | null = null
  private lastPlaybackState: boolean | null = null

  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
    devices: [],
  }

  private constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate
    logger.debug('Spotify Polling Service Initialized (Centralized Client).')
  }

  public static async create(
    broadcastUpdate: (message: ServerMessage) => void
  ): Promise<SpotifyPolling> {
    const instance = new SpotifyPolling(broadcastUpdate)
    instance.startPolling()
    return instance
  }

  public getState(): SpotifyData {
    return { ...this.state }
  }

  public startPolling() {
    if (this.pollInterval) return
    const intervalMs = process.env.SPOTIFY_POLLING_INTERVAL_MS
      ? parseInt(process.env.SPOTIFY_POLLING_INTERVAL_MS, 10)
      : 3000
    this.pollInterval = setInterval(() => this.getCurrentlyPlaying(), intervalMs)
    logger.debug(`Spotify polling started with interval: ${intervalMs}ms.`)
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  private getCurrentlyPlaying = async () => {
    const sdk = await spotifyClient.getSdk() // Use centralized client
    if (!sdk) return

    try {
      const playbackState = await sdk.player.getCurrentlyPlayingTrack()

      if (!playbackState) {
        if (this.lastPlaybackState !== false) {
          this.lastPlaybackState = false
          this.state = {
            ...this.state,
            trackName: 'Nothing is currently playing.',
            artist: '',
            isPlaying: false,
          }
          this.broadcast()
        }
        return
      }

      if (playbackState.currently_playing_type !== 'track' && playbackState.currently_playing_type !== 'episode') {
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
          ...this.state,
          trackName,
          artist: artistName,
          isPlaying,
        }
        this.broadcast()
      }
    } catch (error) {
      // 429 and 401 handling is implicit in SDK/TokenManager, but we log unexpected errors
      // Use a simpler log here to avoid noise
      const err = error as { status?: number }
      if (err?.status !== 429) {
         // logger.error({ err }, 'Polling error') // Optional: uncomment if debugging
      }
    }
  }

  public async refreshDevices(): Promise<void> {
    const sdk = await spotifyClient.getSdk()
    if (!sdk) return

    try {
      const response = await sdk.player.getAvailableDevices()
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
      this.broadcast()
    } catch (error) {
      logger.error({ err: error }, 'Error fetching devices')
    }
  }

  // Handle Command delegates to the Client now, but refreshes state immediately after
  public async handleCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ) {
    if (command === 'GET_DEVICES') {
      return this.refreshDevices()
    }

    const success = await spotifyClient.executeCommand(async (sdk) => {
      switch (command) {
        case 'PLAY':
          await sdk.player.startResumePlayback(deviceId || undefined, playlistUri)
          break
        case 'PAUSE':
          await sdk.player.pausePlayback(deviceId || undefined)
          break
        case 'NEXT':
          await sdk.player.skipToNext(deviceId || undefined)
          break
        case 'PREVIOUS':
          await sdk.player.skipToPrevious(deviceId || undefined)
          break
        case 'TRANSFER_PLAYBACK':
          if (deviceId) await sdk.player.transferPlayback([deviceId], true)
          break
        case 'SET_VOLUME':
          if (volume !== undefined) {
            const clamped = Math.max(0, Math.min(100, Math.round(volume)))
            await sdk.player.setPlaybackVolume(clamped, deviceId)
          }
          break
      }
    }, command)

    if (success) {
      // Optimistic update / fast follow-up poll
      setTimeout(() => this.getCurrentlyPlaying(), 500)
    }
  }

  private broadcast() {
    this.broadcastUpdate({
      type: 'SPOTIFY_UPDATE',
      payload: this.getState(),
    })
  }

  public cleanup() {
    this.stopPolling()
  }
}
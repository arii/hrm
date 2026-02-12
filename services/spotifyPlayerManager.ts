import { SpotifyCommandParameters } from '@/types/core'
import { ServerMessage, SpotifyCommand, SpotifyData } from '@/types/websocket'
import { SafeSpotifyApi } from '@/services/safeSpotifyApi'
import logger from '@/utils/logger.server'
import { isEmptyResponseError } from '@/services/spotifyUtils'
import { Track, Episode } from '@spotify/web-api-ts-sdk'

const NOT_PLAYING_MESSAGE = 'Nothing is currently playing.'

export interface ParsedPlaybackState {
  trackId: string
  trackName: string
  artist: string
  albumName: string
  albumArtUrl: string
  isPlaying: boolean
}

export class SpotifyPlayerManager {
  private sdk: SafeSpotifyApi
  private broadcastUpdate: (message: ServerMessage) => void
  private getState: () => SpotifyData
  private setState: (
    update: SpotifyData | ((prevState: SpotifyData) => SpotifyData)
  ) => void

  constructor(
    sdk: SafeSpotifyApi,
    broadcastUpdate: (message: ServerMessage) => void,
    getState: () => SpotifyData,
    setState: (
      update: SpotifyData | ((prevState: SpotifyData) => SpotifyData)
    ) => void
  ) {
    this.sdk = sdk
    this.broadcastUpdate = broadcastUpdate
    this.getState = getState
    this.setState = setState
  }

  public async refreshPlaybackState(): Promise<void> {
    const playbackState = await this.fetchPlaybackState()
    const currentState = this.getState()

    if (!playbackState) {
      if (
        currentState.isPlaying ||
        currentState.trackName !== NOT_PLAYING_MESSAGE
      ) {
        this.setState((prev) => ({
          ...prev,
          trackId: null,
          trackName: NOT_PLAYING_MESSAGE,
          artist: '',
          albumName: '',
          albumArtUrl: '',
          isPlaying: false,
        }))
        this.broadcastUpdate({
          type: 'SPOTIFY_UPDATE',
          payload: this.getState(),
        })
      }
      return
    }

    const { trackId, trackName, artist, albumName, albumArtUrl, isPlaying } =
      playbackState

    if (
      trackId !== currentState.trackId ||
      isPlaying !== currentState.isPlaying
    ) {
      this.setState((prev) => ({
        ...prev,
        trackId,
        trackName,
        artist,
        albumName,
        albumArtUrl,
        isPlaying,
      }))

      this.broadcastUpdate({
        type: 'SPOTIFY_UPDATE',
        payload: this.getState(),
      })
    }
  }

  private async fetchPlaybackState(): Promise<ParsedPlaybackState | null> {
    const playbackState = await this.sdk.player.getCurrentlyPlayingTrack()

    if (!playbackState || !playbackState.item) {
      return null
    }

    const item = playbackState.item
    const isPlaying = playbackState.is_playing

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
    }
  }

  public async executeSpotifyCommand(
    command: SpotifyCommand,
    params: SpotifyCommandParameters
  ) {
    const { deviceId, volume, playlistUri, contextUri, uri } = params
    const effectiveContextUri = contextUri || playlistUri
    const sdk = this.sdk

    switch (command) {
      case 'PLAY':
        await this.executeSdkCommand(
          command,
          () => {
            if (uri) {
              return sdk.player.startResumePlayback(deviceId, undefined, [uri])
            }
            if (effectiveContextUri) {
              return sdk.player.startResumePlayback(
                deviceId,
                effectiveContextUri
              )
            }
            return sdk.player.startResumePlayback(deviceId)
          },
          { deviceId, contextUri: effectiveContextUri, uri }
        )
        break
      case 'PAUSE':
        await this.executeSdkCommand(
          command,
          () => sdk.player.pausePlayback(deviceId),
          { deviceId }
        )
        break
      case 'NEXT':
        await this.executeSdkCommand(
          command,
          () => sdk.player.skipToNext(deviceId),
          { deviceId }
        )
        break
      case 'PREVIOUS':
        await this.executeSdkCommand(
          command,
          () => sdk.player.skipToPrevious(deviceId),
          { deviceId }
        )
        break
      case 'TRANSFER_PLAYBACK':
        if (deviceId) {
          await this.executeSdkCommand(
            command,
            () => sdk.player.transferPlayback([deviceId], true),
            { deviceId }
          )
        }
        break
      case 'SET_VOLUME':
        if (volume !== undefined) {
          const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)))
          await this.executeSdkCommand(
            command,
            () => sdk.player.setPlaybackVolume(clampedVolume, deviceId),
            { deviceId, volume: clampedVolume }
          )
          this.setState((prevState) => ({
            ...prevState,
            volume: clampedVolume,
            isMuted: clampedVolume === 0,
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
}

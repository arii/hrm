import { SpotifyCommandParameters } from '../types/core'
import { ServerMessage, SpotifyCommand, SpotifyData } from '../types/websocket'
import { SafeSpotifyApi } from './safeSpotifyApi'
import logger from '../utils/logger.server.js'
import { isEmptyResponseError } from './spotifyUtils.js'
import { Track, Episode } from '@spotify/web-api-ts-sdk'

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

  public async fetchPlaybackState(): Promise<Partial<SpotifyData> | null> {
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

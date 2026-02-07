// types/spotify-custom.ts
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

/**
 * A type-safe wrapper for SpotifyApi that allows `undefined` for deviceId
 * in player control methods, matching the SDK's runtime behavior but fixing
 * the strict typing issue.
 */
export type SafeSpotifyApi = Omit<SpotifyApi, 'player'> & {
  player: Omit<
    SpotifyApi['player'],
    | 'startResumePlayback'
    | 'pausePlayback'
    | 'skipToNext'
    | 'skipToPrevious'
    | 'setPlaybackVolume'
  > & {
    startResumePlayback(
      deviceId: string | undefined,
      context_uri?: string,
      uris?: string[],
      offset?: object,
      position_ms?: number
    ): Promise<void>
    pausePlayback(deviceId: string | undefined): Promise<void>
    skipToNext(deviceId: string | undefined): Promise<void>
    skipToPrevious(deviceId: string | undefined): Promise<void>
    setPlaybackVolume(
      volume_percent: number,
      deviceId: string | undefined
    ): Promise<void>
  }
}

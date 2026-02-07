// types/spotify-web-api-ts-sdk.d.ts
import '@spotify/web-api-ts-sdk'

declare module '@spotify/web-api-ts-sdk' {
  interface Player {
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

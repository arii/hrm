import { SpotifyApi } from '@spotify/web-api-ts-sdk'

type Player = SpotifyApi['player']

interface SafePlayer
  extends Omit<
    Player,
    | 'startResumePlayback'
    | 'pausePlayback'
    | 'skipToNext'
    | 'skipToPrevious'
    | 'setPlaybackVolume'
  > {
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

export type SafeSpotifyApi = Omit<SpotifyApi, 'player'> & {
  player: SafePlayer
}

export function createSafeSpotifyApi(sdk: SpotifyApi): SafeSpotifyApi {
  return new Proxy(sdk, {
    get(target, prop, receiver) {
      if (prop === 'player') {
        return new Proxy(Reflect.get(target, prop, receiver), {
          get(playerTarget, playerProp, playerReceiver) {
            return Reflect.get(playerTarget, playerProp, playerReceiver)
          },
        })
      }
      return Reflect.get(target, prop, receiver)
    },
  }) as unknown as SafeSpotifyApi
}

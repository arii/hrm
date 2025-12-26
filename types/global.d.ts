// types/global.d.ts
import { SpotifyPlayer, SpotifyPlayerOptions } from './spotify'

declare global {
  interface Window {
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer
    }
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

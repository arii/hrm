// lib/spotify-sdk.ts
interface SpotifyPlayerOptions {
  name: string
  getOAuthToken: (cb: (token: string) => void) => void
  volume?: number
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>
  disconnect: () => void
  setVolume: (volume: number) => Promise<void>
  addListener(event: string, callback: (data: any) => void): void
  removeListener(event: string): void
  _options: {
    id: string
    name: string
  }
}

declare global {
  interface Window {
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer
    }
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

/**
 * Loads the Spotify Web Playback SDK script.
 * @returns A promise that resolves when the SDK is loaded.
 */
export function loadSpotifySdk(): Promise<void> {
  return new Promise((resolve) => {
    if (window.Spotify) {
      return resolve()
    }
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)
    window.onSpotifyWebPlaybackSDKReady = () => {
      resolve()
    }
  })
}

/**
 * Initializes the Spotify player.
 * @param options The options for the Spotify player.
 * @returns The Spotify player instance.
 */
export function initializePlayer(options: SpotifyPlayerOptions): SpotifyPlayer {
  return new window.Spotify.Player(options)
}

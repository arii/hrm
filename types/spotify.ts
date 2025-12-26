// types/spotify.ts
export interface SpotifyDevice {
  id: string
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number
}

export interface SpotifyPlayer {
  connect: () => Promise<boolean>
  disconnect: () => void
  setVolume: (volume: number) => Promise<void>
  addListener(
    event: 'ready' | 'not_ready',
    callback: (data: { device_id: string }) => void
  ): void
  addListener(
    event:
      | 'initialization_error'
      | 'authentication_error'
      | 'account_error'
      | 'playback_error',
    callback: (data: { message: string }) => void
  ): void
  removeListener: (event: string) => void
  _options: {
    id: string
    name: string
  }
}

export interface SpotifyPlayerOptions {
  name: string
  getOAuthToken: (cb: (token: string) => void) => void
  volume?: number
}

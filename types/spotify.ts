// types/spotify.ts

export type SpotifyCommand =
  | 'PLAY'
  | 'NEXT'
  | 'PREVIOUS'
  | 'LOGIN'
  | 'TRANSFER_PLAYBACK'
  | 'SET_VOLUME'
  | 'PAUSE'

export interface SpotifyCurrentlyPlayingResponse {
  timestamp: number
  context: {
    external_urls: {
      spotify: string
    }
    href: string
    type: string
    uri: string
  }
  progress_ms: number
  is_playing: boolean
  item: {
    album: {
      album_type: string
      artists: Array<{
        external_urls: {
          spotify: string
        }
        href: string
        id: string
        name: string
        type: string
        uri: string
      }>
      external_urls: {
        spotify: string
      }
      href: string
      id: string
      images: Array<{
        height: number
        url: string
        width: number
      }>
      name: string
      release_date: string
      release_date_precision: string
      total_tracks: number
      type: string
      uri: string
    }
    artists: Array<{
      external_urls: {
        spotify: string
      }
      href: string
      id: string
      name: string
      type: string
      uri: string
    }>
    available_markets: string[]
    disc_number: number
    duration_ms: number
    explicit: boolean
    external_ids: {
      isrc: string
    }
    external_urls: {
      spotify: string
    }
    href: string
    id: string
    is_local: boolean
    name: string
    popularity: number
    preview_url: string
    track_number: number
    type: string
    uri: string
  }
  currently_playing_type: string
  actions: {
    disallows: {
      resuming: boolean
      skipping_prev: boolean
    }
  }
}

export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

export interface SpotifyDevice {
  id: string
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number
}

export interface SpotifyDevicesResponse {
  devices: SpotifyDevice[]
}

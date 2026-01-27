// types/spotify.ts

export interface Track {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string }
  imageUrl?: string | null
}

export interface Playlist {
  name: string
  uri: string
  id?: string
  isPreset?: boolean
  isSearchResult?: boolean
  imageUrl?: string | null
  description?: string | null
  trackCount?: number
  owner?: string
}

import { AccessToken } from '@spotify/web-api-ts-sdk'

/**
 * @description Extends the base AccessToken from the Spotify SDK to include additional properties
 * used internally for session management and service interoperability.
 * @property {string} provider - The authentication provider (e.g., 'spotify').
 * @property {string} sub - The subject identifier, not provided by Spotify but included for consistency.
 * @property {number} obtainedAt - The timestamp when the token was obtained, in milliseconds.
 */
export interface ProcessedAccessTokenData extends AccessToken {
  provider: string
  sub: string
  obtainedAt: number
}

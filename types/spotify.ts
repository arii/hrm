// types/spotify.ts

export interface Track {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string }
  imageUrl?: string | null
  uri: string
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

/**
 * Data Transfer Object for a preset Spotify playlist.
 * These are curated playlists with a simple name and URI.
 */
export interface PresetPlaylistDto {
  name: string
  uri: string
}

/**
 * Data Transfer Object for a user's Spotify playlist.
 * This includes detailed information about the playlist, such as its name,
 * description, cover image, and track count.
 */
export interface UserPlaylistDto {
  id: string
  name: string
  uri: string
  description: string | null
  imageUrl: string | null
  trackCount: number
  owner: string
  public: boolean
}

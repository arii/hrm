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

// types/spotify.ts

export interface Track {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string }
  imageUrl?: string | null
}

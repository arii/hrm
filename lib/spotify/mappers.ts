import type { SimplifiedPlaylist } from '@spotify/web-api-ts-sdk'
import type { SpotifyPlaylist } from '@/types/core'

/** First Spotify image URL, or null when there are no images. */
export const firstImageUrl = (
  images: readonly { url: string }[] | null | undefined
): string | null => {
  if (!images || images.length === 0) return null
  return images[0]?.url ?? null
}

/**
 * Maps a Spotify API playlist object to the app's SpotifyPlaylist shape.
 * Single owner of the field mapping previously duplicated across the
 * playlist list/search routes.
 */
export const mapSimplifiedPlaylistToSpotifyPlaylist = (
  playlist: SimplifiedPlaylist
): SpotifyPlaylist => ({
  id: playlist.id,
  name: playlist.name,
  uri: playlist.uri,
  description: playlist.description || null,
  imageUrl: firstImageUrl(playlist.images),
  trackCount: playlist.tracks?.total || 0,
  owner: playlist.owner?.display_name || playlist.owner?.id || 'Unknown',
  public: playlist.public || false,
})

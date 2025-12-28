// File: app/api/spotify/playlists/[playlistId]/route.ts
/**
 * API Route: Fetches details for a single Spotify playlist.
 */
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'
import { getAuthenticatedSpotifyApi } from '@/lib/spotify/sdk'

interface MappedTrack {
  uri: string
  name: string
  artist: string
  duration: string
}

/**
 * GET handler for fetching single playlist details.
 * @param req The incoming NextRequest.
 * @param params The route parameters, containing the playlistId.
 * @returns A NextResponse with the playlist details or an error.
 */
async function getPlaylistDetails(_req: Request, ...args: unknown[]) {
  const { params } = args[0] as { params: { playlistId: string } }
  const { playlistId } = params

  if (!playlistId) {
    throw new ApiError(400, 'Playlist ID is required.')
  }

  const spotify = await getAuthenticatedSpotifyApi()
  const playlist = await spotify.playlists.getPlaylist(playlistId)

  if (!playlist) {
    throw new ApiError(404, 'Playlist not found.')
  }

  // Spotify's API paginates playlist tracks. We need to fetch all pages.
  let allItems = playlist.tracks.items
  let next = playlist.tracks.next
  while (next && allItems.length < 500) {
    const nextUrl = new URL(next)
    const offset = parseInt(nextUrl.searchParams.get('offset') || '0', 10)
    const limit = parseInt(nextUrl.searchParams.get('limit') || '100', 10)

    if (offset === 0) break // Should not happen if next is set

    const nextPage = await spotify.playlists.getPlaylistItems(
      playlistId,
      undefined,
      undefined,
      limit as any,
      offset
    )
    allItems = [...allItems, ...nextPage.items]
    next = nextPage.next
  }

  const tracks = allItems
    .map((item): MappedTrack | null => {
      if (!item.track || item.track.type !== 'track') {
        return null
      }
      const durationMs = item.track.duration_ms
      const minutes = Math.floor(durationMs / 60000)
      const seconds = Math.floor((durationMs % 60000) / 1000)
        .toString()
        .padStart(2, '0')

      return {
        uri: item.track.uri,
        name: item.track.name,
        artist: item.track.artists.map((artist) => artist.name).join(', '),
        duration: `${minutes}:${seconds}`,
      }
    })
    // The map operation above can return null for non-track items,
    // so we filter them out here.
    .filter((item): item is MappedTrack => item !== null)

  return NextResponse.json({
    name: playlist.name,
    description: playlist.description,
    imageUrl:
      playlist.images && playlist.images.length > 0 && playlist.images[0]
        ? playlist.images[0].url
        : null,
    tracks,
  })
}

export const GET = withErrorHandler(getPlaylistDetails)

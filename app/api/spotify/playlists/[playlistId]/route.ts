// File: app/api/spotify/playlists/[playlistId]/route.ts
/**
 * API Route: Fetches details for a single Spotify playlist.
 */
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'
import { getAuthenticatedSpotifyApi } from '@/lib/spotify/sdk'
import logger from '@/utils/logger'

interface MappedTrack {
  uri: string
  name: string
  artist: string
  duration: string
}

// Limit the number of tracks fetched from a playlist to avoid performance issues.
const MAX_TRACKS_LIMIT = 500
const SPOTIFY_API_DEFAULT_LIMIT = 50
const OFFSET_PARAM = 'offset'
const LIMIT_PARAM = 'limit'

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
  let pageCount = 0
  while (next && allItems.length < MAX_TRACKS_LIMIT) {
    pageCount++
    logger.debug(
      `Fetching page ${pageCount} of playlist ${playlistId}, current track count: ${allItems.length}, next URL: ${next}`
    )
    const nextUrl = new URL(next)
    const offset = parseInt(nextUrl.searchParams.get(OFFSET_PARAM) || '0', 10)
    const limit = parseInt(
      nextUrl.searchParams.get(LIMIT_PARAM) ||
        SPOTIFY_API_DEFAULT_LIMIT.toString(),
      10
    )

    if (offset === 0) break // Should not happen if next is set

    // @ts-expect-error - The Spotify SDK type for limit is MaxInt<50>, but the API supports up to 100.
    const nextPage = await spotify.playlists.getPlaylistItems(
      playlistId,
      undefined,
      undefined,
      limit,
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

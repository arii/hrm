// File: app/api/spotify/playlists/[playlistId]/tracks/route.ts
/**
 * API Route: Fetches tracks for a specific Spotify playlist with pagination.
 */
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'
import { getAuthenticatedSpotifyApi } from '@/lib/spotify/sdk'
import { firstImageUrl } from '@/lib/spotify/mappers'
import { RouteContext } from '@/lib/types/index'
import type { MaxInt } from '@spotify/web-api-ts-sdk'

// Spotify caps page size at 50 items.
const DEFAULT_TRACKS_LIMIT = 20
const MAX_TRACKS_LIMIT = 50

/** Parses and clamps the ?limit= query param to a valid Spotify page size. */
const parseTracksLimit = (raw: string | null): MaxInt<50> => {
  const parsed = parseInt(raw ?? '', 10)
  if (isNaN(parsed)) return DEFAULT_TRACKS_LIMIT as MaxInt<50>
  return Math.min(Math.max(parsed, 1), MAX_TRACKS_LIMIT) as MaxInt<50>
}

/** Parses the ?offset= query param; garbage becomes 0. */
const parseTracksOffset = (raw: string | null): number => {
  const parsed = parseInt(raw ?? '', 10)
  return isNaN(parsed) ? 0 : Math.max(parsed, 0)
}

/**
 * GET handler for fetching playlist tracks.
 * @param req The incoming NextRequest.
 * @param context The route context, containing the playlistId.
 * @returns A NextResponse with the paginated list of tracks or an error.
 */
async function getPlaylistTracks(
  req: Request,
  context: RouteContext<{ playlistId: string }>
) {
  const { playlistId } = await context.params
  const { searchParams } = new URL(req.url)
  const limit = parseTracksLimit(searchParams.get('limit'))
  const offset = parseTracksOffset(searchParams.get('offset'))

  if (!playlistId) {
    throw new ApiError(400, 'Playlist ID is required.')
  }

  const spotify = await getAuthenticatedSpotifyApi()
  const response = await spotify.playlists.getPlaylistItems(
    playlistId,
    undefined,
    undefined,
    limit,
    offset
  )

  const tracks = response.items
    .map(({ track }) => {
      if (track === null || track.type !== 'track') {
        return null
      }
      return {
        id: track.id,
        name: track.name,
        artists: track.artists.map((artist) => artist.name).join(', '),
        // Local/unlinked tracks can arrive without album metadata.
        album: track.album?.name ?? null,
        albumArt: firstImageUrl(track.album?.images),
        duration: track.duration_ms,
        uri: track.uri,
      }
    })
    .filter(Boolean)

  return NextResponse.json({
    tracks,
    total: response.total,
    limit: response.limit,
    offset: response.offset,
    next: response.next,
    previous: response.previous,
  })
}

export const GET = withErrorHandler(getPlaylistTracks)

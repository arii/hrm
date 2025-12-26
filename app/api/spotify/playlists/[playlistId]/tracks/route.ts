// File: app/api/spotify/playlists/[playlistId]/tracks/route.ts
/**
 * API Route: Fetches tracks for a specific Spotify playlist with pagination.
 */
import { NextResponse } from 'next/server'
import { withErrorHandler } from '../../../../../lib/middleware/errorHandler'
import { ApiError } from '../../../../../lib/errors'
import { getAuthenticatedSpotifyApi } from '../../../../../lib/spotify/sdk'

/**
 * GET handler for fetching playlist tracks.
 * @param req The incoming Request object.
 * @param params The route parameters, containing the playlistId.
 * @returns A NextResponse with the paginated list of tracks or an error.
 */
async function getPlaylistTracks(
  req: Request,
  { params }: { params: { playlistId: string } }
) {
  const { playlistId } = params
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

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
        albumArt:
          track.album.images && track.album.images.length > 0
            ? track.album.images[0]?.url ?? null
            : null,
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

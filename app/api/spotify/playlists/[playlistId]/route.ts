// File: app/api/spotify/playlists/[playlistId]/route.ts
/**
 * API Route: Fetches details for a single Spotify playlist.
 */
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'
import { getAuthenticatedSpotifyApi } from '@/lib/spotify/sdk'
import { RouteContext } from '@/lib/types/index'
import { Track } from '@spotify/web-api-ts-sdk'
import { mapSpotifyTrack } from '@/lib/spotify'

/**
 * GET handler for fetching single playlist details.
 * @param req The incoming NextRequest.
 * @param context The route context, containing the playlistId.
 * @returns A NextResponse with the playlist details or an error.
 */
async function getPlaylistDetails(
  _req: Request,
  context: RouteContext<{ playlistId: string }>
) {
  const { playlistId } = await context.params

  if (!playlistId) {
    throw new ApiError(400, 'Playlist ID is required.')
  }

  const spotify = await getAuthenticatedSpotifyApi()
  const playlist = await spotify.playlists.getPlaylist(playlistId)

  if (!playlist) {
    throw new ApiError(404, 'Playlist not found.')
  }

  return NextResponse.json({
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    imageUrl:
      playlist.images && playlist.images.length > 0
        ? (playlist.images[0]?.url ?? null)
        : null,
    owner: playlist.owner?.display_name ?? null,
    trackCount: playlist.tracks?.total ?? 0,
    tracks: playlist.tracks.items
      .filter((item) => item.track !== null && item.track.type === 'track')
      .map((item) => mapSpotifyTrack(item.track as Track)),
  })
}

export const GET = withErrorHandler(getPlaylistDetails)

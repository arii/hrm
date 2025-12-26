// File: app/api/spotify/playlists/[playlistId]/route.ts
/**
 * API Route: Fetches details for a single Spotify playlist.
 */
import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'
import { getAuthenticatedSpotifyApi } from '@/lib/spotify/sdk'

type Props = {
  params: {
    playlistId: string
  }
}

/**
 * GET handler for fetching single playlist details.
 * @param _req The incoming NextRequest.
 * @param params The route parameters, containing the playlistId.
 * @returns A NextResponse with the playlist details or an error.
 */
async function getPlaylistDetails(_req: NextRequest, { params }: Props) {
  const { playlistId } = params

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
  })
}

export const GET = withErrorHandler(getPlaylistDetails)

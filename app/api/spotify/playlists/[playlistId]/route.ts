// File: app/api/spotify/playlists/[playlistId]/route.ts
/**
 * API Route: Fetches details for a single Spotify playlist.
 */
import { authOptions } from '@/lib/auth'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'

/**
 * GET handler for fetching single playlist details.
 * @param req The incoming NextRequest.
 * @param params The route parameters, containing the playlistId.
 * @returns A NextResponse with the playlist details or an error.
 */
async function getPlaylistDetails(
  req: NextRequest,
  { params }: { params: { playlistId: string } }
) {
  const { playlistId } = params

  if (!playlistId) {
    throw new ApiError(400, 'Playlist ID is required.')
  }

  const session = await getServerSession(authOptions)
  if (!session || !session.accessToken) {
    throw new ApiError(401, 'Not authenticated or token is missing.')
  }

  const spotify = SpotifyApi.withAccessToken(
    process.env.SPOTIFY_CLIENT_ID || '',
    {
      access_token: session.accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: '',
    }
  )

  const playlist = await spotify.playlists.getPlaylist(playlistId)

  if (!playlist) {
    throw new ApiError(404, 'Playlist not found.')
  }

  return NextResponse.json({
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    imageUrl: playlist.images.length > 0 ? playlist.images[0].url : null,
    owner: playlist.owner.display_name,
    trackCount: playlist.tracks.total,
  })
}

export const GET = withErrorHandler(getPlaylistDetails)

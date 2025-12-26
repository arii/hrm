// app/api/spotify/playlists/[playlistId]/route.ts
import { NextResponse } from 'next/server'
import { getAuthenticatedSpotifyApi } from '@/lib/spotify/sdk'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'

type GetParams = {
  params: {
    playlistId: string
  }
}

async function getPlaylistDetails(
  _req: Request,
  { params }: GetParams
): Promise<NextResponse> {
  const { playlistId } = params

  if (!playlistId) {
    throw new ApiError(400, 'Playlist ID is required')
  }

  const spotifyApi = await getAuthenticatedSpotifyApi()
  const playlist = await spotifyApi.playlists.getPlaylist(playlistId)

  if (!playlist) {
    throw new ApiError(404, 'Playlist not found')
  }

  return NextResponse.json(playlist)
}

export const GET = withErrorHandler(getPlaylistDetails)

// File: app/api/spotify/playlists/[playlistId]/route.ts
/**
 * API Route: Fetches details for a single Spotify playlist.
 */
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'
import { getAuthenticatedSpotifyApi } from '@/lib/spotify/sdk'

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

  const tracks = playlist.tracks.items
    .map((item) => {
      if (!item.track || item.track.type !== 'track') {
        return null
      }
      return {
        uri: item.track.uri,
        name: item.track.name,
        artist: item.track.artists.map((artist) => artist.name).join(', '),
        duration: item.track.duration_ms,
      }
    })
    // The map operation above can return null for non-track items,
    // so we filter them out here.
    .filter(Boolean)

  return NextResponse.json({
    name: playlist.name,
    description: playlist.description,
    imageUrl:
      playlist.images && playlist.images.length > 0
        ? playlist.images[0].url
        : null,
    tracks,
  })
}

export const GET = withErrorHandler(getPlaylistDetails)

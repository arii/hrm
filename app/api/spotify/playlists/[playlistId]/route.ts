// app/api/spotify/playlists/[playlistId]/route.ts

import { authOptions } from '@/lib/auth'
import {
  SpotifyApi,
  type SimplifiedTrack,
  type Track,
  SimplifiedAlbum,
} from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'

/**
 * API route to fetch tracks for a specific Spotify playlist.
 *
 * This endpoint retrieves the tracks of a playlist given its ID.
 * It supports pagination using 'limit' and 'offset' query parameters.
 *
 * @param _req The incoming Next.js API request.
 * @param context The context object containing route parameters.
 * @returns A NextResponse object with the playlist tracks or an error.
 */
async function getPlaylistTracks(
  _req: Request,
  context: { params: { playlistId: string } }
) {
  // 1. Get the server-side session.
  const session = await getServerSession(authOptions)

  // 2. Check if the session and token exist.
  if (!session || !session.accessToken) {
    throw new ApiError(401, 'Not authenticated or token is missing.')
  }

  // 3. Extract playlistId from the route parameters.
  const { playlistId } = context.params
  if (!playlistId) {
    throw new ApiError(400, 'Playlist ID is required.')
  }

  // 4. Get pagination parameters from the URL query.
  const { searchParams } = new URL(_req.url)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  // 5. Initialize Spotify SDK with access token
  const spotify = SpotifyApi.withAccessToken(
    process.env.SPOTIFY_CLIENT_ID || '',
    {
      access_token: session.accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: session.refreshToken || '',
    }
  )

  // 6. Fetch the playlist tracks from the Spotify API.
  const tracksResponse = await spotify.playlists.getPlaylistItems(
    playlistId,
    undefined, // market
    'items(track(name,artists,album(name,images),duration_ms,uri,explicit,popularity))',
    limit,
    offset
  )

  const totalTracks = tracksResponse.total

  // 7. Map the response to a more streamlined format.
  const tracks = tracksResponse.items
    .map(({ track }) => {
      if (!track) return null // Handle cases where track is null (e.g., deleted)

      // Use the Track type from the SDK for better type safety
      const trackDetails = track as Track | SimplifiedTrack

      if ('album' in trackDetails) {
        return {
          name: trackDetails.name,
          uri: trackDetails.uri,
          durationMs: trackDetails.duration_ms,
          explicit: trackDetails.explicit,
          popularity: (trackDetails as Track).popularity,
          artists: trackDetails.artists.map((artist) => artist.name).join(', '),
          albumImageUrl:
            (trackDetails.album as SimplifiedAlbum)?.images?.[0]?.url || null,
          albumName: trackDetails.album.name,
        }
      }
      return null
    })
    .filter(Boolean) // Remove any null tracks

  return NextResponse.json({ tracks, total: totalTracks, limit, offset })
}

export const GET = withErrorHandler(getPlaylistTracks)

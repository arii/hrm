// File: app/api/spotify/playlists/route.ts

import { getPresetPlaylists } from '@/services/spotifyPlaylistService'
import { SpotifyApi, SimplifiedPlaylist } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs' // Force Node.js runtime

/**
 * API route to fetch a combined list of preset and user-specific Spotify playlists.
 *
 * This route requires a valid user session. It first retrieves a predefined list
 * of themed playlists and then fetches the current user's playlists from Spotify,
 * combining them into a single response.
 *
 * @returns {Promise<NextResponse>} A JSON response containing `presetPlaylists`
 *                                   and `userPlaylists`, or an error message.
 */
async function getPlaylistsHandler(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    throw new ApiError(401, 'Not authenticated or token is missing.')
  }

  // Initialize Spotify API with the user's access token
  const spotifyApi = SpotifyApi.withAccessToken(
    process.env.SPOTIFY_CLIENT_ID as string,
    {
      access_token: session.accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // Placeholder, token is already valid
      refresh_token: '', // Not needed for this call
    }
  )

  const presetPlaylists = getPresetPlaylists()
  let userPlaylists: SimplifiedPlaylist[] = []

  try {
    // Fetch user's playlists from Spotify
    const userPlaylistsResponse =
      await spotifyApi.currentUser.playlists.playlists(50)
    userPlaylists = userPlaylistsResponse.items
  } catch (error) {
    // If fetching user playlists fails, we still return the presets
    // This provides a fallback and better user experience.
    console.error(
      'Failed to fetch user playlists, returning presets only',
      error
    )
    // Optionally re-throw if user playlists are critical
    // throw new ApiError(502, 'Failed to fetch user playlists.');
  }

  return NextResponse.json({
    presetPlaylists,
    userPlaylists,
  })
}

export const GET = withErrorHandler(getPlaylistsHandler)

// app/api/spotify/playlists/route.ts
// API route for the standalone Spotify playlist selection page
// This endpoint is only used by app/client/spotify-selection/page.tsx

import { authOptions } from '@/lib/auth'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'
import { env } from '@/lib/env'

/**
 * API route to fetch preset and user Spotify playlists.
 *
 * This endpoint is specifically for the standalone Spotify playlist selection page.
 * It returns both preset playlists (HIIT, Rock, Pop) and the user's personal playlists.
 * Uses the official Spotify Web API TypeScript SDK for type safety and automatic pagination.
 *
 * @param _req The incoming Next.js API request (unused).
 * @returns A NextResponse object with preset and user playlists or an error.
 */
async function getPlaylists(_req: Request) {
  // 1. Get the server-side session.
  const session = await getServerSession(authOptions)

  // 2. Check if the session and token exist.
  if (!session || !session.accessToken) {
    throw new ApiError(401, 'Not authenticated or token is missing.')
  }

  if (!env.SPOTIFY_CLIENT_ID) {
    throw new Error('Spotify client ID is not defined.')
  }

  // 3. Initialize Spotify SDK with access token
  const spotify = SpotifyApi.withAccessToken(env.SPOTIFY_CLIENT_ID, {
    access_token: session.accessToken,
    token_type: 'Bearer',
    expires_in: 3600, // Approximate, actual expiry handled by NextAuth
    refresh_token: '', // Not needed for this use case
  })

  // 4. Fetch all user playlists (SDK handles pagination automatically)
  // Correct syntax for @spotify/web-api-ts-sdk
  const playlistsResponse = await spotify.currentUser.playlists.playlists(50)

  // 5. Preset playlists for the standalone page
  const presetPlaylists = [
    { name: 'HIIT', uri: 'spotify:playlist:37i9dQZF1DX4p6TLfEhgD5' },
    { name: 'Rock', uri: 'spotify:playlist:37i9dQZF1DX1spT6G94GFC' },
    { name: 'Pop', uri: 'spotify:playlist:37i9dQZF1DXcBWfL3ps8cR' },
  ]

  // 6. Map user playlists to include full data (images, descriptions, track counts, etc.)
  const userPlaylists = playlistsResponse.items.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    uri: playlist.uri,
    description: playlist.description || null,
    imageUrl:
      playlist.images && playlist.images.length > 0 && playlist.images[0]
        ? playlist.images[0].url
        : null,
    trackCount: playlist.tracks?.total || 0,
    owner: playlist.owner?.display_name || playlist.owner?.id || 'Unknown',
    public: playlist.public || false,
  }))

  return NextResponse.json({ presetPlaylists, userPlaylists })
}

export const GET = withErrorHandler(getPlaylists)

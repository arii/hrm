// app/api/spotify/playlists/route.ts
// API route for the standalone Spotify playlist selection page
// This endpoint is only used by app/client/spotify-selection/page.tsx

import { authOptions } from '@/lib/auth'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'

/**
 * @openapi
 * /api/spotify/playlists:
 *   get:
 *     summary: Fetch user's Spotify playlists
 *     description: Retrieves a list of the user's playlists from Spotify, along with a few preset playlists.
 *     tags:
 *       - Spotify
 *     responses:
 *       200:
 *         description: A list of preset and user playlists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 presetPlaylists:
 *                   type: array
 *                   items:
 *                     type: object
 *                 userPlaylists:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal Server Error.
 */
async function getPlaylists(_req: Request) {
  const session = await getServerSession(authOptions)

  // 2. Check if the session and token exist.
  if (!session || !session.accessToken) {
    throw new ApiError(401, 'Not authenticated or token is missing.')
  }

  // 3. Initialize Spotify SDK with access token
  const spotify = SpotifyApi.withAccessToken(
    process.env.SPOTIFY_CLIENT_ID || '',
    {
      access_token: session.accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // Approximate, actual expiry handled by NextAuth
      refresh_token: '', // Not needed for this use case
    }
  )

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

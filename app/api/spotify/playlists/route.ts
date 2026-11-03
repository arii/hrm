// app/api/spotify/playlists/route.ts
// API route for the standalone Spotify playlist selection page
// This endpoint is only used by app/client/spotify-selection/page.tsx

import { NextResponse, NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { getAuthenticatedSpotifyApi } from '@/lib/spotify/sdk'
import { mapSimplifiedPlaylistToSpotifyPlaylist } from '@/lib/spotify/mappers'
import { SpotifyPlaylist } from '@/types/core'

/**
 * API route to fetch preset and user Spotify playlists.
 *
 * This endpoint is specifically for the standalone Spotify playlist selection page.
 * It returns both preset playlists (Workout, Rock, Pop) and the user's personal playlists.
 * Uses the official Spotify Web API TypeScript SDK for type safety and automatic pagination.
 *
 * @param _req The incoming Next.js API request (unused).
 * @returns A NextResponse object with preset and user playlists or an error.
 */
async function getPlaylists(_req: NextRequest) {
  const spotify = await getAuthenticatedSpotifyApi()

  // 4. Fetch all user playlists (SDK handles pagination automatically)
  // Correct syntax for @spotify/web-api-ts-sdk
  const playlistsResponse = await spotify.currentUser.playlists.playlists(50)

  // 5. Preset playlists for the standalone page.
  // URIs verified live Nov 2026 (#9772): Spotify retires editorial IDs, so
  // re-probe via open.spotify.com before assuming these resolve.
  const presetPlaylists: SpotifyPlaylist[] = [
    { name: 'Workout', uri: 'spotify:playlist:37i9dQZF1DX0HRj9P7NxeE' },
    { name: 'Rock', uri: 'spotify:playlist:37i9dQZF1DX1spT6G94GFC' },
    { name: 'Pop', uri: 'spotify:playlist:37i9dQZF1DWUa8ZRTfalHk' },
  ]

  // 6. Map user playlists to include full data (images, descriptions, track counts, etc.)
  const userPlaylists: SpotifyPlaylist[] = playlistsResponse.items.map(
    mapSimplifiedPlaylistToSpotifyPlaylist
  )

  return NextResponse.json({ presetPlaylists, userPlaylists })
}

export const GET = withErrorHandler(getPlaylists)

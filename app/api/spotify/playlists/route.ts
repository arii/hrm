// app/api/spotify/playlists/route.ts
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import {
  getPresetPlaylists,
  getUserPlaylists,
} from '@/services/spotifyPlaylistService'
import { getSpotifyClient } from '@/utils/socketManager'

/**
 * API route to fetch preset and user Spotify playlists.
 *
 * This endpoint now uses the centralized SpotifyClient singleton to ensure
 * it uses the same authenticated instance as the rest of the application.
 *
 * @returns A NextResponse object with preset and user playlists or an error.
 */
async function getPlaylists(_req: Request) {
  // 1. Get the singleton instance of the SpotifyClient.
  const spotifyClient = getSpotifyClient()

  // 2. Fetch preset and user playlists using the service functions.
  const presetPlaylists = getPresetPlaylists()
  const userPlaylists = await getUserPlaylists(spotifyClient)

  // 3. Return the combined playlists.
  return NextResponse.json({ presetPlaylists, userPlaylists })
}

export const GET = withErrorHandler(getPlaylists)

// app/api/spotify/playlists/route.ts
import { validateSession } from '@/lib/api/session'
import { getSpotifyClient } from '@/lib/api/spotify'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * API route to fetch preset and user Spotify playlists.
 *
 * @param _req The incoming Next.js API request (unused).
 * @returns A NextResponse object with preset and user playlists or an error.
 */
export async function GET(_req: Request) {
  try {
    const session = await validateSession()
    const spotify = getSpotifyClient(session)

    // Fetch all user playlists (SDK handles pagination automatically)
    const playlistsResponse = await spotify.currentUser.playlists.playlists(50)

    // Preset playlists for the standalone page
    const presetPlaylists = [
      { name: 'HIIT', uri: 'spotify:playlist:37i9dQZF1DX4p6TLfEhgD5' },
      { name: 'Rock', uri: 'spotify:playlist:37i9dQZF1DX1spT6G94GFC' },
      { name: 'Pop', uri: 'spotify:playlist:37i9dQZF1DXcBWfL3ps8cR' },
    ]

    // Map user playlists to include full data
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

    return successResponse({ presetPlaylists, userPlaylists })
  } catch (error) {
    return errorResponse(error)
  }
}

// app/api/spotify/playlists/route.ts
// API route for the standalone Spotify playlist selection page
// This endpoint is only used by app/client/spotify-selection/page.tsx

import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { SpotifyApiService } from '@/services/spotifyApi'
import { getPresetPlaylists } from '@/services/spotifyPlaylistService'
import { ApiError } from '@/lib/errors'

async function getPlaylists(_req: Request) {
  const spotifyApiService = SpotifyApiService.getInstance()
  const sdk = spotifyApiService.getSdk()

  if (!sdk) {
    throw new ApiError(503, 'Spotify service not available')
  }

  const playlistsResponse = await sdk.currentUser.playlists.playlists(50)

  const presetPlaylists = getPresetPlaylists()

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

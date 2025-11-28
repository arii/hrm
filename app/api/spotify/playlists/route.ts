// File: app/api/spotify/playlists/route.ts (Spotify Playlists REST Handler - Refactored)
/**
 * API route for the standalone Spotify playlist selection page.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { ApiError } from '@/lib/errors'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

async function getPlaylists(_req: NextRequest) {
  const session = await getCurrentUser()

  if (!session || !session.accessToken) {
    throw new ApiError(401, 'Authorization required')
  }

  const spotify = SpotifyApi.withAccessToken(
    process.env.SPOTIFY_CLIENT_ID || '',
    {
      access_token: session.accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: '',
    }
  )

  const playlistsResponse = await spotify.currentUser.playlists.playlists(50)

  const presetPlaylists = [
    { name: 'HIIT', uri: 'spotify:playlist:37i9dQZF1DX4p6TLfEhgD5' },
    { name: 'Rock', uri: 'spotify:playlist:37i9dQZF1DX1spT6G94GFC' },
    { name: 'Pop', uri: 'spotify:playlist:37i9dQZF1DXcBWfL3ps8cR' },
  ]

  const userPlaylists = playlistsResponse.items.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    uri: playlist.uri,
    description: playlist.description || null,
    imageUrl: playlist.images?.[0]?.url || null,
    trackCount: playlist.tracks?.total || 0,
    owner: playlist.owner?.display_name || playlist.owner?.id || 'Unknown',
    public: playlist.public || false,
  }))

  return NextResponse.json({ presetPlaylists, userPlaylists })
}

export const GET = withErrorHandler(getPlaylists)

/**
 * Handles OPTIONS requests for CORS preflight.
 */
export const OPTIONS = async () => {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}

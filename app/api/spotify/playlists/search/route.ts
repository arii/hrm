// File: app/api/spotify/playlists/search/route.ts (Spotify Playlist Search REST Handler - Refactored)
/**
 * API route to search for public Spotify playlists.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { ApiError } from '@/lib/errors'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { SpotifyApi, SimplifiedPlaylist } from '@spotify/web-api-ts-sdk'

async function searchPlaylists(req: NextRequest) {
  const session = await getCurrentUser()

  if (!session || !session.accessToken) {
    throw new ApiError(401, 'Authorization required')
  }

  const searchParams = req.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ items: [] })
  }

  if (query.length > 100) {
    throw new ApiError(400, 'Search query too long')
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

  const searchResponse = await spotify.search(
    query,
    ['playlist'],
    undefined,
    20
  )

  const searchResults = (searchResponse.playlists?.items || []).map(
    (playlist: SimplifiedPlaylist) => ({
      id: playlist.id,
      name: playlist.name,
      uri: playlist.uri,
      description: playlist.description || null,
      imageUrl: playlist.images?.[0]?.url || null,
      trackCount: playlist.tracks?.total || 0,
      owner: playlist.owner?.display_name || playlist.owner?.id || 'Unknown',
      public: playlist.public || false,
      isSearchResult: true,
    })
  )

  return NextResponse.json({ items: searchResults })
}

export const GET = withErrorHandler(searchPlaylists)

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

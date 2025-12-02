// app/api/spotify/playlists/search/route.ts
// API route to search for public Spotify playlists
// This endpoint is used by the PlaylistSelector component to search for popular playlists

import { authOptions } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { withQueryValidation } from '@/lib/middleware/validation'
import { playlistSearchSchema } from '@/lib/validation/schemas'
import { SimplifiedPlaylist, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const handler = async (
  req: NextRequest,
  { query }: { query: z.infer<typeof playlistSearchSchema> }
) => {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.accessToken) {
      throw new ApiError(401, 'Not authenticated or token is missing.')
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
      query.query,
      ['playlist'],
      undefined,
      20
    )

    const searchResults = (searchResponse.playlists?.items || []).map(
      (playlist) => {
        const fullPlaylist = playlist as SimplifiedPlaylist
        return {
          id: fullPlaylist.id,
          name: fullPlaylist.name,
          uri: fullPlaylist.uri,
          description: fullPlaylist.description || null,
          imageUrl:
            fullPlaylist.images?.[0]?.url || null,
          trackCount: fullPlaylist.tracks?.total || 0,
          owner:
            fullPlaylist.owner?.display_name ||
            fullPlaylist.owner?.id ||
            'Unknown',
          public: fullPlaylist.public || false,
          isSearchResult: true,
        }
      }
    )

    return NextResponse.json({ items: searchResults })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    console.error(`[API /playlists/search] Internal Server Error: ${message}`)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export const GET = withQueryValidation(playlistSearchSchema, handler)

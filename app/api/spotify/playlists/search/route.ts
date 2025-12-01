// app/api/spotify/playlists/search/route.ts
// API route to search for public Spotify playlists
// This endpoint is used by the PlaylistSelector component to search for popular playlists

import { authOptions } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { withValidation } from '@/lib/middleware/validation'
import { spotifySearchSchema } from '@/lib/validation/schemas'
import { SimplifiedPlaylist, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Validated API route handler for searching public Spotify playlists.
 *
 * @param _req The incoming Next.js API request (not directly used).
 * @param validatedData The validated query parameters from the Zod schema.
 * @returns A NextResponse object with search results or an error.
 */
const searchHandler = async (
  _req: NextRequest,
  validatedData: z.infer<typeof spotifySearchSchema>
) => {
  try {
    // 1. Get the server-side session.
    const session = await getServerSession(authOptions)

    // 2. Check if the session and token exist.
    if (!session || !session.accessToken) {
      throw new ApiError(401, 'Not authenticated or token is missing.')
    }

    const { query, type } = validatedData

    // 3. Initialize Spotify SDK with access token
    const spotify = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID || '',
      {
        access_token: session.accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: session.refreshToken || '',
      }
    )

    // 4. Search for playlists using the SDK
    const searchResponse = await spotify.search(
      query,
      type as ('playlist' | 'album')[], // The Zod schema ensures 'type' is string[], SDK expects specific literals
      undefined,
      20
    )

    // 5. Map search results to include full data
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
          owner: fullPlaylist.owner?.display_name || 'Unknown',
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

// Wrap the handler with the validation middleware
export const GET = withValidation(spotifySearchSchema, searchHandler)

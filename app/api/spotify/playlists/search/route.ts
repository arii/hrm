// app/api/spotify/playlists/search/route.ts
// API route to search for public Spotify playlists
// This endpoint is used by the PlaylistSelector component to search for popular playlists

import { authOptions } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { SimplifiedPlaylist, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API route to search for public Spotify playlists.
 *
 * This endpoint searches Spotify's public playlist catalog and returns results
 * that can be combined with user playlists in the PlaylistSelector component.
 *
 * @param req The incoming Next.js API request containing a 'q' query parameter.
 * @returns A NextResponse object with search results or an error.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Get the server-side session.
    const session = await getServerSession(authOptions)

    // 2. Check if the session and token exist.
    if (!session || !session.accessToken) {
      throw new ApiError(401, 'Not authenticated or token is missing.')
    }

    // 3. Get search query from URL parameters
    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ items: [] })
    }

    // Enforce a maximum length for the search query to prevent abuse
    if (query.length > 100) {
      return NextResponse.json(
        { error: 'Search query too long' },
        { status: 400 }
      )
    }
    // 4. Initialize Spotify SDK with access token
    const spotify = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID || '',
      {
        access_token: session.accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: '',
      }
    )

    // 5. Search for playlists using the SDK
    const searchResponse = await spotify.search(
      query,
      ['playlist'],
      undefined,
      20
    )

    // 6. Map search results to include full data
    const searchResults = (searchResponse.playlists?.items || []).map(
      (playlist) => {
        // Assert the type here
        const fullPlaylist = playlist as SimplifiedPlaylist

        return {
          id: fullPlaylist.id,
          name: fullPlaylist.name,
          uri: fullPlaylist.uri,
          description: fullPlaylist.description || null,
          imageUrl:
            fullPlaylist.images &&
            fullPlaylist.images.length > 0 &&
            fullPlaylist.images[0]
              ? fullPlaylist.images[0].url
              : null,
          // This line will now work
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

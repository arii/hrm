// app/api/spotify/playlists/search/route.ts
// API route to search for public Spotify playlists
// This endpoint is used by the PlaylistSelector component to search for popular playlists

import { authOptions } from '@/lib/auth'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
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
      console.error('[API /playlists/search] No session or access token found.')
      return NextResponse.json(
        { error: 'Not authenticated or token is missing.' },
        { status: 401 }
      )
    }

    // 3. Get search query from URL parameters
    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ items: [] })
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
    // The search method searches across tracks, albums, artists, and playlists
    // Method signature: search(query: string, types: SearchType[], limit?: number, market?: string)
    const searchResponse = await spotify.search(query, ['playlist'], 20)

    // 6. Map search results to include full data
    const searchResults = (searchResponse.playlists?.items || []).map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      uri: playlist.uri,
      description: playlist.description || null,
      imageUrl: playlist.images && playlist.images.length > 0 
        ? playlist.images[0].url 
        : null,
      trackCount: playlist.tracks?.total || 0,
      owner: playlist.owner?.display_name || playlist.owner?.id || 'Unknown',
      public: playlist.public || false,
      isSearchResult: true, // Flag to distinguish from user/preset playlists
    }))

    return NextResponse.json({ items: searchResults })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    console.error(`[API /playlists/search] Internal Server Error: ${message}`)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}


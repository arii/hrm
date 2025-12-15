// File: app/api/spotify/playlists/search/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { authOptions } from '@/lib/auth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'

export const runtime = 'nodejs' // Force Node.js runtime

/**
 * API route to search for Spotify playlists based on a query.
 *
 * This route is protected and requires a valid user session. It takes a search
 * query from the request and uses the Spotify API to find matching playlists.
 *
 * @param {NextRequest} req - The incoming request object, containing the search query.
 * @returns {Promise<NextResponse>} A JSON response with the search results or an error.
 */
async function searchPlaylistsHandler(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    throw new ApiError(401, 'Not authenticated or token is missing.')
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query')

  if (!query) {
    throw new ApiError(400, 'Search query is required.')
  }

  // Initialize Spotify API with user's access token
  const spotifyApi = SpotifyApi.withAccessToken(
    process.env.SPOTIFY_CLIENT_ID as string,
    {
      access_token: session.accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // Placeholder
      refresh_token: '', // Not needed for search
    }
  )

  // Perform the search
  const results = await spotifyApi.search(query, ['playlist'], undefined, 20)

  return NextResponse.json(results.playlists.items)
}

export const GET = withErrorHandler(searchPlaylistsHandler)

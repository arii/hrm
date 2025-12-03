import { authOptions } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { SimplifiedPlaylist, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const searchSchema = z.object({
  q: z.string().min(1).max(100),
})

/**
 * @openapi
 * /api/spotify/playlists/search:
 *   get:
 *     summary: Search for Spotify playlists
 *     description: Searches for public playlists on Spotify based on a query.
 *     tags:
 *       - Spotify
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: The search query.
 *     responses:
 *       200:
 *         description: A list of playlists matching the query.
 *       400:
 *         description: Invalid or missing query parameter.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal Server Error.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.accessToken) {
      throw new ApiError(401, 'Not authenticated or token is missing.')
    }

    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get('q')

    const validation = searchSchema.safeParse({ q: query })
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: validation.error.flatten() },
        { status: 400 }
      )
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
            fullPlaylist.images && fullPlaylist.images.length > 0 && fullPlaylist.images[0]
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

// File: app/api/spotify/search/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { SpotifyApi, AccessToken } from '@spotify/web-api-ts-sdk'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
  }

  try {
    const token: AccessToken = {
      access_token: session.accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // This is a dummy value, token is managed by NextAuth
    }

    const sdk = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID as string,
      token
    )

    const results = await sdk.search(query, ['track'])

    return NextResponse.json(results.tracks.items)
  } catch (error) {
    console.error('Error searching Spotify:', error)
    return NextResponse.json({ error: 'Failed to fetch search results from Spotify' }, { status: 500 })
  }
}

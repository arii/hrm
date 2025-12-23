
import { NextRequest, NextResponse } from 'next/server'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getToken } from 'next-auth/jwt'

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token || !token.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  if (!q) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
  }

  try {
    const sdk = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID as string,
      {
        access_token: token.accessToken as string,
        token_type: 'Bearer',
        expires_in: token.expiresIn as number,
        refresh_token: token.refreshToken as string,
      }
    );

    const results = await sdk.search(q, ["track"], 'US', 5);

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error searching Spotify:', error)
    return NextResponse.json({ error: 'Error searching Spotify' }, { status: 500 })
  }
}

import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const type = searchParams.get('type') || 'track,artist,album'

  if (!query) {
    return NextResponse.json({ error: 'No query provided' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const SPOTIFY_API_BASE = process.env.SPOTIFY_API_BASE || 'https://api.spotify.com/v1'
    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(
        query
      )}&type=${type}&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          {
            error: 'Spotify token expired',
            errorCode: 'SPOTIFY_TOKEN_EXPIRED',
          },
          { status: 401 }
        )
      }
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Spotify API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Spotify Search Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

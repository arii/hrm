import { authOptions } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'

async function searchSpotify(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const type = searchParams.get('type') || 'track,artist,album'

  if (!query) {
    throw new ApiError(400, 'No query provided')
  }

  const session = await getServerSession(authOptions)

  if (!session || !session.accessToken) {
    throw new ApiError(401, 'Unauthorized')
  }

  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(
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
      // Token expired handling could be improved here or let client re-auth
      throw new ApiError(401, 'Token expired')
    }
    const errorText = await response.text()
    throw new ApiError(
      response.status,
      `Spotify API error: ${response.status}: ${errorText}`
    )
  }

  const data = await response.json()
  return NextResponse.json(data)
}

export const GET = withErrorHandler(searchSpotify)

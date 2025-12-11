// app/api/spotify/categories/route.ts
import { authOptions } from '@/lib/auth'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { ApiError } from '@/lib/errors'

async function getCategories(_req: Request) {
  const session = await getServerSession(authOptions)

  if (!session || !session.accessToken) {
    throw new ApiError(401, 'Not authenticated or token is missing.')
  }

  const spotify = SpotifyApi.withAccessToken(
    process.env.SPOTIFY_CLIENT_ID || '',
    {
      access_token: session.accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // Approximate, actual expiry handled by NextAuth
      refresh_token: '', // Not needed for this use case
    }
  )

  const categoriesResponse = await spotify.browse.getCategories({
    limit: 50,
  })

  const fitnessKeywords = [
    'workout',
    'running',
    'gym',
    'motivation',
    'pop',
    'dance',
    'rock',
    'power',
    'cardio',
    'hiit',
    'training',
  ]

  const fitnessCategories = categoriesResponse.categories.items.filter(
    (category) =>
      fitnessKeywords.some((keyword) =>
        category.name.toLowerCase().includes(keyword)
      ) || fitnessKeywords.includes(category.id.toLowerCase())
  )

  return NextResponse.json({ categories: fitnessCategories })
}

export const GET = withErrorHandler(getCategories)

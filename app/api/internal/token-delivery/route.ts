// app/api/internal/token-delivery/route.ts
import { spotifyService } from '@/lib/services'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const newTokens = await request.json()

    if (!newTokens || !newTokens.access_token) {
      return NextResponse.json(
        { error: 'Invalid token data provided.' },
        { status: 400 }
      )
    }

    // Direct, event-driven, and reliable
    await spotifyService.updateTokens(newTokens)

    return NextResponse.json(
      { message: 'Tokens delivered successfully' },
      { status: 200 }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    console.error(`[API /token-delivery] Internal Server Error: ${message}`)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// File: app/api/spotify/control/route.ts (Spotify Control REST Handler - Fallback)
import { NextRequest, NextResponse } from 'next/server'
import { withValidation } from '@/lib/middleware/validation'
import { spotifyControlSchema } from '@/lib/validation/schemas'
import { sendSpotifyCommand } from '@/services/spotify/spotifyApiService'
import { z } from 'zod'

const handler = async (
  req: NextRequest,
  body: z.infer<typeof spotifyControlSchema>
) => {
  try {
    const result = await sendSpotifyCommand(body.command)
    return NextResponse.json(result)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred'

    if (errorMessage === 'Authorization required') {
      return NextResponse.json({ error: errorMessage }, { status: 401 })
    }

    console.error('REST control failed:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

export const POST = withValidation(spotifyControlSchema, handler)

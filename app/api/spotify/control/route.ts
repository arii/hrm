// File: app/api/spotify/control/route.ts (Spotify Control REST Handler - Refactored)
/**
 * Spotify Control REST Handler - Fallback/Demonstration Endpoint
 * This route serves as a secure REST endpoint for external control or testing
 * but the primary control commands are sent via WebSocket.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { withValidation } from '@/lib/middleware/validation'
import { spotifyControlSchema } from '@/lib/validation/schemas'
import logger from '@/utils/logger'
import { z } from 'zod'

const handler = async (
  _req: NextRequest,
  body: z.infer<typeof spotifyControlSchema>
) => {
  const session = await getCurrentUser()

  if (!session || !session.accessToken) {
    return NextResponse.json(
      { error: 'Authorization required' },
      { status: 401 }
    )
  }

  const { command } = body

  try {
    const SPOTIFY_API_BASE = 'https://api.spotify.com/v1/me/player'
    let endpoint = ''
    let method = 'POST' // Default to POST for most controls

    switch (command) {
      case 'PLAY':
        endpoint = 'play'
        method = 'PUT'
        break
      case 'PAUSE':
        endpoint = 'pause'
        method = 'PUT'
        break
      case 'NEXT':
        endpoint = 'next'
        break
      case 'PREVIOUS':
        endpoint = 'previous'
        break
      default:
        return NextResponse.json({ error: 'Invalid command' }, { status: 400 })
    }

    const response = await fetch(`${SPOTIFY_API_BASE}/${endpoint}`, {
      method: method,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })

    if (response.status === 204) {
      return NextResponse.json({
        success: true,
        message: `Command '${command}' executed.`,
      })
    }

    const errorData = await response.json()
    return NextResponse.json(
      {
        error: 'Spotify API error',
        details: errorData.error?.message || 'Unknown Spotify error',
      },
      { status: response.status }
    )
  } catch (error) {
    logger.error({ error }, 'REST control failed')
    return NextResponse.json(
      { error: 'Internal server error processing command.' },
      { status: 500 }
    )
  }
}

export const POST = withValidation(spotifyControlSchema, handler)

/**
 * Handles OPTIONS requests for CORS preflight.
 */
export const OPTIONS = async () => {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}

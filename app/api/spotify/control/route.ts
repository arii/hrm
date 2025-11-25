// File: app/api/spotify/control/route.ts (Spotify Control REST Handler - Fallback)
/**
 * Spotify Control REST Handler - Fallback/Demonstration Endpoint
 * This route serves as a secure REST endpoint for external control or testing
 * but the primary control commands are sent via WebSocket.
 */
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { withValidation } from '@/lib/middleware/validation'
import { spotifyControlSchema } from '@/lib/validation/schemas'
import { z } from 'zod'

const handler = async (
  _req: NextRequest,
  body: z.infer<typeof spotifyControlSchema>
) => {
  const session = await getServerSession(authOptions)

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
    let method = ''

    // Map the simple command to the correct Spotify API endpoint and method
    switch (command) {
      case 'PLAY':
        endpoint = 'play'
        method = 'PUT' // Resumes playback
        break
      case 'NEXT':
        endpoint = 'next'
        method = 'POST' // Skips to next
        break
      case 'PREVIOUS':
        endpoint = 'previous'
        method = 'POST' // Skips to previous
        break
    }

    // Make the actual call to the Spotify API
    const response = await fetch(`${SPOTIFY_API_BASE}/${endpoint}`, {
      method: method,
      headers: {
        // Use the user's access token from the session
        Authorization: `Bearer ${session.accessToken}`,
      },
    })

    // Spotify returns 204 No Content on a successful player command
    if (response.status === 204) {
      return NextResponse.json({
        success: true,
        message: `Command '${command}' executed.`,
      })
    }

    // If it's not 204, something went wrong (e.g., no active device, premium required)
    const errorData = await response.json()
    return NextResponse.json(
      {
        error: 'Spotify API error',
        details: errorData.error?.message || 'Unknown Spotify error',
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('REST control failed:', error)
    return NextResponse.json(
      { error: 'Internal server error processing command.' },
      { status: 500 }
    )
  }
}

export const POST = withValidation(spotifyControlSchema, handler)

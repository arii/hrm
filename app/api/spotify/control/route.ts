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

/**
 * @swagger
 * /api/spotify/control:
 *   post:
 *     description: Controls Spotify playback
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               command:
 *                 type: string
 *                 enum: [PLAY, PAUSE, NEXT, PREVIOUS, SET_VOLUME, TRANSFER_PLAYBACK]
 *               volume:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               deviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Command executed successfully
 *       204:
 *         description: Command executed successfully (No Content)
 *       401:
 *         description: Authorization required
 *       500:
 *         description: Internal server error
 */
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

  const { command, volume, deviceId } = body

  try {
    const SPOTIFY_API_BASE = 'https://api.spotify.com/v1/me/player'
    let endpoint = ''
    let method = ''
    let requestBody

    // Map the simple command to the correct Spotify API endpoint and method
    switch (command) {
      case 'PLAY':
        endpoint = 'play'
        method = 'PUT' // Resumes playback
        break
      case 'PAUSE':
        endpoint = 'pause'
        method = 'PUT' // Pauses playback
        break
      case 'NEXT':
        endpoint = 'next'
        method = 'POST' // Skips to next
        break
      case 'PREVIOUS':
        endpoint = 'previous'
        method = 'POST' // Skips to previous
        break
      case 'SET_VOLUME':
        endpoint = `volume?volume_percent=${volume}`
        method = 'PUT'
        break
      case 'TRANSFER_PLAYBACK':
        endpoint = ''
        method = 'PUT'
        requestBody = { device_ids: [deviceId] }
        break
    }

    // Make the a POSTual call to the Spotify API
    const response = await fetch(`${SPOTIFY_API_BASE}/${endpoint}`, {
      method: method,
      headers: {
        // Use the user's access token from the session
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
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

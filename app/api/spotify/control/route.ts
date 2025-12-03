import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { spotifyControlSchema } from '@/lib/validation/schemas'
import { withValidation } from '@/lib/middleware/validation'

/**
 * @openapi
 * /api/spotify/control:
 *   post:
 *     summary: Control Spotify Playback
 *     description: Sends playback control commands to the Spotify API.
 *     tags:
 *       - Spotify
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SpotifyControl'
 *     responses:
 *       200:
 *         description: Command executed successfully.
 *       400:
 *         description: Invalid request body or command.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal Server Error.
 */
const handler = async (
  req: NextRequest,
  body: z.infer<typeof spotifyControlSchema>
) => {
  const session = await getServerSession(authOptions)
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
  }

  const { command, volume, deviceId } = body

  try {
    const SPOTIFY_API_BASE = 'https://api.spotify.com/v1/me/player'
    let url = ''
    let method = ''

    const queryParams = deviceId ? `?device_id=${deviceId}` : ''

    switch (command) {
      case 'PLAY':
        url = `${SPOTIFY_API_BASE}/play${queryParams}`
        method = 'PUT'
        break
      case 'PAUSE':
        url = `${SPOTIFY_API_BASE}/pause${queryParams}`
        method = 'PUT'
        break
      case 'NEXT':
        url = `${SPOTIFY_API_BASE}/next${queryParams}`
        method = 'POST'
        break
      case 'PREVIOUS':
        url = `${SPOTIFY_API_BASE}/previous${queryParams}`
        method = 'POST'
        break
      case 'SET_VOLUME':
        url = `${SPOTIFY_API_BASE}/volume?volume_percent=${volume}${
          deviceId ? `&device_id=${deviceId}` : ''
        }`
        method = 'PUT'
        break
      case 'TRANSFER_PLAYBACK':
        url = SPOTIFY_API_BASE
        method = 'PUT'
        break
    }

    // Special handling for Transfer Playback body
    const fetchOptions: RequestInit = {
      method: method,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    }

    if (command === 'TRANSFER_PLAYBACK') {
        fetchOptions.body = JSON.stringify({ device_ids: [deviceId], play: true })
    }

    const response = await fetch(url, fetchOptions)

    // Handle 204 No Content (Success) explicitly
    if (response.status === 204) {
      return NextResponse.json({ success: true, message: `Command '${command}' executed.` })
    }

    // Handle other statuses
    // Attempt to parse JSON only if content-type is json or text exists
    const text = await response.text()
    if (!response.ok) {
        let errorDetails = text
        try {
            const json = JSON.parse(text)
            errorDetails = json.error?.message || text
        } catch (_e) {
            // Text was not JSON
        }
        console.error(`Spotify API Error (${response.status}): ${errorDetails}`)
        return NextResponse.json(
            { error: 'Spotify API error', details: errorDetails },
            { status: response.status }
        )
    }

    return NextResponse.json({ success: true, message: `Command '${command}' executed.` })

  } catch (error) {
    console.error('REST control failed:', error)
    return NextResponse.json(
      { error: 'Internal server error processing command.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export const POST = withValidation(spotifyControlSchema, handler)

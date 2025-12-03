// File: app/api/spotify/control/route.ts
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

/**
 * @openapi
 * /api/spotify/control:
 *   post:
 *     summary: Control Spotify Playback
 *     description: >
 *       Sends playback commands to the Spotify API on behalf of the user.
 *       Requires an active session.
 *     tags:
 *       - Spotify
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               command:
 *                 type: string
 *                 description: The playback command to execute.
 *                 enum: [PLAY, PAUSE, NEXT, PREVIOUS, SET_VOLUME, TRANSFER_PLAYBACK]
 *               volume:
 *                 type: integer
 *                 description: The volume percentage (0-100). Required for SET_VOLUME.
 *                 minimum: 0
 *                 maximum: 100
 *               deviceId:
 *                 type: string
 *                 description: The ID of the device to target. Required for TRANSFER_PLAYBACK.
 *             required:
 *               - command
 *           examples:
 *             play:
 *               summary: Play music
 *               value:
 *                 command: "PLAY"
 *                 deviceId: "your_device_id"
 *             set_volume:
 *               summary: Set volume
 *               value:
 *                 command: "SET_VOLUME"
 *                 volume: 80
 *     responses:
 *       200:
 *         description: Command executed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Command 'PLAY' executed."
 *       400:
 *         description: Bad Request (e.g., invalid command or missing parameters).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authorization required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
import { withValidation } from '@/lib/middleware/validation'
import { spotifyControlSchema } from '@/lib/validation/schemas'

export const POST = withValidation(spotifyControlSchema, async (req, body) => {
  const session = await getServerSession(authOptions)

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
  }
  
  const { command, volume, deviceId } = body

  try {
    const SPOTIFY_API_BASE = 'https://api.spotify.com/v1/me/player' // Corrected Base URL
    let url = ''
    let method = ''
    
    // Construct Query Parameters if needed (e.g. device_id)
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
        // Volume requires a query param 'volume_percent'
        if (volume === undefined) throw new Error('Volume required for SET_VOLUME')
        url = `${SPOTIFY_API_BASE}/volume?volume_percent=${volume}${deviceId ? `&device_id=${deviceId}` : ''}`
        method = 'PUT'
        break
       case 'TRANSFER_PLAYBACK':
         if (!deviceId) throw new Error('Device ID required for TRANSFER_PLAYBACK')
         url = `${SPOTIFY_API_BASE}`
         method = 'PUT'
         // Transfer requires a specific body structure
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
})

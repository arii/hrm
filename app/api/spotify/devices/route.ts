// File: app/api/spotify/devices/route.ts
/**
 * @file Next.js API Route for fetching available Spotify devices.
 * This endpoint retrieves a list of the user's available playback devices
 * from the Spotify API. It requires a valid session.
 */

import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { serviceContainer } from '../../../services/registry'

/**
 * @swagger
 * /api/spotify/devices:
 *   get:
 *     summary: Get Spotify Devices
 *     description: Retrieves a list of available Spotify playback devices for the authenticated user.
 *     tags:
 *       - Spotify
 *     responses:
 *       200:
 *         description: A list of Spotify devices.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                   is_active:
 *                     type: boolean
 *       401:
 *         description: Unauthorized. User is not authenticated.
 *       500:
 *         description: Internal Server Error. Spotify service may not be available.
 */
export async function GET(req: Request) {
  const token = await getToken({ req })

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!serviceContainer || !serviceContainer.spotifyService.isReady()) {
    return NextResponse.json(
      { error: 'Spotify service not available' },
      { status: 500 }
    )
  }

  try {
    const devices = await serviceContainer.spotifyService.getAvailableDevices()
    return NextResponse.json(devices)
  } catch (error) {
    console.error('Error fetching Spotify devices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Spotify devices' },
      { status: 500 }
    )
  }
}

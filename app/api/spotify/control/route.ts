// File: app/api/spotify/control/route.ts
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import logger from '@/utils/logger'
import { z } from 'zod'

export const runtime = 'nodejs' // Force Node.js runtime

// Zod schema for input validation
const controlSchema = z.object({
  command: z.enum([
    'PLAY',
    'PAUSE',
    'NEXT',
    'PREVIOUS',
    'SET_VOLUME',
    'TRANSFER_PLAYBACK',
  ]),
  deviceId: z.string().optional(),
  volume: z.number().min(0).max(100).optional(),
  context_uri: z.string().optional(), // For starting playback of a specific playlist/album
})

type ControlRequestBody = z.infer<typeof controlSchema>

// Helper function to build Spotify API URLs
const spotifyApiUrl = (path: string) => `https://api.spotify.com/v1${path}`

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ControlRequestBody = await req.json()
    const validation = controlSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { command, deviceId, volume, context_uri } = validation.data
    const { accessToken } = session

    let url: string
    let method: 'PUT' | 'POST' = 'PUT' // Most playback commands use PUT
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchBody: Record<string, any> = {}

    switch (command) {
      case 'PLAY':
        url = spotifyApiUrl(`/me/player/play?device_id=${deviceId}`)
        if (context_uri) {
          fetchBody.context_uri = context_uri
        }
        break
      case 'PAUSE':
        url = spotifyApiUrl(`/me/player/pause?device_id=${deviceId}`)
        break
      case 'NEXT':
        url = spotifyApiUrl(`/me/player/next?device_id=${deviceId}`)
        method = 'POST'
        break
      case 'PREVIOUS':
        url = spotifyApiUrl(`/me/player/previous?device_id=${deviceId}`)
        method = 'POST'
        break
      case 'SET_VOLUME':
        if (typeof volume !== 'number') {
          return NextResponse.json(
            { error: 'Volume must be a number' },
            { status: 400 }
          )
        }
        url = spotifyApiUrl(`/me/player/volume?volume_percent=${volume}`)
        if (deviceId) {
          url += `&device_id=${deviceId}`
        }
        break
      case 'TRANSFER_PLAYBACK':
        if (!deviceId) {
          return NextResponse.json(
            { error: 'Device ID is required for transfer' },
            { status: 400 }
          )
        }
        url = spotifyApiUrl('/me/player')
        fetchBody.device_ids = [deviceId]
        fetchBody.play = true // Optionally start playback on transfer
        break
      default:
        return NextResponse.json({ error: 'Invalid command' }, { status: 400 })
    }

    const spotifyResponse = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: Object.keys(fetchBody).length ? JSON.stringify(fetchBody) : null,
    })

    if (!spotifyResponse.ok) {
      const error = await spotifyResponse.json()
      logger.error({ error }, 'Spotify API Error')
      return NextResponse.json(
        { error: 'Spotify API error', details: error },
        { status: spotifyResponse.status }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    logger.error({ error }, 'REST control failed')
    return NextResponse.json(
      {
        error: 'Internal server error processing command.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// File: app/api/spotify/devices/route.ts (Spotify Devices REST Handler - Refactored)
/**
 * API route to fetch available Spotify devices for the authenticated user.
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import logger from '@/utils/logger'

export async function GET(_req: Request) {
  try {
    const session = await getCurrentUser()

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const response = await fetch(
      'https://api.spotify.com/v1/me/player/devices',
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(
        {
          status: response.status,
          error: errorText,
        },
        'Spotify API error fetching devices'
      )
      return NextResponse.json(
        { error: 'Failed to fetch devices from Spotify.' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data.devices || [])
  } catch (error) {
    logger.error({ error }, 'Internal server error fetching devices')
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}

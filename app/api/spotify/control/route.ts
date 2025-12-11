// File: app/api/spotify/control/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.accessToken) {
    return NextResponse.json(
      { error: 'Authorization required' },
      { status: 401 }
    )
  }

  // Parse body safely
  let body
  try {
    body = await req.json()
  } catch (_e) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { command, volume, deviceId } = body

  // Allowed commands
  const VALID_COMMANDS = [
    'PLAY',
    'PAUSE',
    'NEXT',
    'PREVIOUS',
    'SET_VOLUME',
    'TRANSFER_PLAYBACK',
  ]
  if (!VALID_COMMANDS.includes(command)) {
    return NextResponse.json(
      { error: `Invalid command: ${command}` },
      { status: 400 }
    )
  }

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
        if (volume === undefined)
          throw new Error('Volume required for SET_VOLUME')
        url = `${SPOTIFY_API_BASE}/volume?volume_percent=${volume}${deviceId ? `&device_id=${deviceId}` : ''}`
        method = 'PUT'
        break
      case 'TRANSFER_PLAYBACK':
        if (!deviceId)
          throw new Error('Device ID required for TRANSFER_PLAYBACK')
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
      return NextResponse.json({
        success: true,
        message: `Command '${command}' executed.`,
      })
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

    return NextResponse.json({
      success: true,
      message: `Command '${command}' executed.`,
    })
  } catch (error) {
    console.error('REST control failed:', error)
    return NextResponse.json(
      {
        error: 'Internal server error processing command.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

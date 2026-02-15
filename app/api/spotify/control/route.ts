// File: app/api/spotify/control/route.ts
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import logger from '@/utils/logger'
import { env } from '@/lib/env'

/**
 * REST endpoint for Spotify playback control.
 * This endpoint consolidates all Spotify commands into a single source of truth,
 * utilizing the Spotify Web API SDK.
 */
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
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { command, volume, deviceId, uri, contextUri } = body

  if (!env.SPOTIFY_CLIENT_ID) {
    logger.error('SPOTIFY_CLIENT_ID is not configured in environment')
    return NextResponse.json(
      { error: 'Spotify service misconfigured on server' },
      { status: 500 }
    )
  }

  // Initialize the SDK with the user's access token from their session.
  // We use the 'withAccessToken' flow for one-off API calls.
  const sdk = SpotifyApi.withAccessToken(env.SPOTIFY_CLIENT_ID, {
    access_token: session.accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: '', // Not required for this request context
  })

  try {
    // MANDATORY SIMPLICITY: Use the SDK player methods with consistent deviceId targeting.
    switch (command) {
      case 'PLAY':
        if (uri) {
          await sdk.player.startResumePlayback(deviceId, undefined, [uri])
        } else if (contextUri) {
          await sdk.player.startResumePlayback(deviceId, contextUri)
        } else {
          await sdk.player.startResumePlayback(deviceId)
        }
        break
      case 'PAUSE':
        await sdk.player.pausePlayback(deviceId)
        break
      case 'NEXT':
        await sdk.player.skipToNext(deviceId)
        break
      case 'PREVIOUS':
        await sdk.player.skipToPrevious(deviceId)
        break
      case 'SET_VOLUME':
        if (volume === undefined) {
          return NextResponse.json(
            { error: 'Volume parameter is required for SET_VOLUME' },
            { status: 400 }
          )
        }
        // Ensure volume is an integer between 0 and 100
        const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)))
        await sdk.player.setPlaybackVolume(clampedVolume, deviceId)
        break
      case 'TRANSFER_PLAYBACK':
        if (!deviceId) {
          return NextResponse.json(
            { error: 'Device ID required for TRANSFER_PLAYBACK' },
            { status: 400 }
          )
        }
        await sdk.player.transferPlayback([deviceId], true)
        break
      default:
        return NextResponse.json(
          { error: `Invalid command: ${command}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Command '${command}' executed successfully.`,
    })
  } catch (error: any) {
    // Check for "No active device" or similar common Spotify API errors
    const errorMessage = error?.message || String(error)
    logger.error({ error, command, deviceId }, 'Spotify SDK control failed')

    return NextResponse.json(
      {
        error: 'Spotify API error',
        details: errorMessage,
      },
      { status: error?.status || 500 }
    )
  }
}

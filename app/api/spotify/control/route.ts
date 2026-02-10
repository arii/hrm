// File: app/api/spotify/control/route.ts
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import logger from '@/utils/logger.server'
import { handleSpotifyApiError } from '@/services/spotifyApiErrorHandling.server'
import { getDeviceId } from '@/lib/spotify/sdk'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.accessToken) {
    return NextResponse.json(
      { error: 'Authorization required' },
      { status: 401 }
    )
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) {
    logger.error('SPOTIFY_CLIENT_ID is not set in the environment variables.')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  const sdk = SpotifyApi.withAccessToken(clientId, {
    access_token: session.accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: session.refreshToken || '',
  })

  try {
    const body = await req.json()
    const { command, deviceId, volume, contextUri, uri, playlistUri } = body

    // Global sanity check: If deviceId is provided, it must be a string.
    if (deviceId != null && typeof deviceId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid deviceId format. Must be a string.' },
        { status: 400 }
      )
    }

    switch (command) {
      case 'PLAY': {
        const uris = uri ? [uri] : undefined
        const playContextUri = playlistUri || contextUri
        await sdk.player.startResumePlayback(
          getDeviceId(deviceId),
          playContextUri,
          uris
        )
        break
      }
      case 'PAUSE':
        await sdk.player.pausePlayback(getDeviceId(deviceId))
        break
      case 'NEXT':
        await sdk.player.skipToNext(getDeviceId(deviceId))
        break
      case 'PREVIOUS':
        await sdk.player.skipToPrevious(getDeviceId(deviceId))
        break
      case 'SET_VOLUME':
        if (typeof volume !== 'number') {
          return NextResponse.json(
            { error: 'Volume must be a number' },
            { status: 400 }
          )
        }
        // Clamp volume between 0 and 100 to prevent API errors
        await sdk.player.setPlaybackVolume(
          Math.max(0, Math.min(100, Math.round(volume))),
          getDeviceId(deviceId)
        )
        break
      case 'TRANSFER_PLAYBACK':
        if (!deviceId) {
          return NextResponse.json(
            { error: 'Device ID is required for TRANSFER_PLAYBACK' },
            { status: 400 }
          )
        }
        await sdk.player.transferPlayback([getDeviceId(deviceId)], true)
        break
      default:
        logger.warn({ command }, 'Invalid Spotify command received')
        return NextResponse.json(
          { error: `Invalid command: ${command}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Command '${command}' executed.`,
    })
  } catch (error) {
    logger.error({ error }, 'Spotify API control error in POST handler')
    return handleSpotifyApiError(error)
  }
}

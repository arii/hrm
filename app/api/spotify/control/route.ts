// File: app/api/spotify/control/route.ts
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import logger from '@/utils/logger.server'
import { handleSpotifyApiError } from '@/services/spotifyApiErrorHandling.server'

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

    switch (command) {
      case 'PLAY': {
        const uris = uri ? [uri] : undefined
        const playContextUri = playlistUri || contextUri
        await sdk.player.startResumePlayback(deviceId, playContextUri, uris)
        break
      }
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
        if (typeof volume !== 'number') {
          return NextResponse.json(
            { error: 'Volume must be a number' },
            { status: 400 }
          )
        }
        await sdk.player.setPlaybackVolume(volume, deviceId)
        break
      case 'TRANSFER_PLAYBACK':
        if (!deviceId || typeof deviceId !== 'string') {
          return NextResponse.json(
            {
              error:
                'Device ID is required and must be a string for TRANSFER_PLAYBACK',
            },
            { status: 400 }
          )
        }
        await sdk.player.transferPlayback([deviceId], true)
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

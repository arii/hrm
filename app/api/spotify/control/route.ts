import { NextRequest, NextResponse } from 'next/server'
import { getSpotifyApiFromSession } from '@/lib/spotify/sdk'
import { ApiError } from '@/lib/errors'
import { handleSpotifyApiError } from '@/services/spotifyApiErrorHandling'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { SafeSpotifyApi } from '@/types/spotify-custom'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: No active session' },
        { status: 401 }
      )
    }

    const sdk = getSpotifyApiFromSession(session) as unknown as SafeSpotifyApi
    const body = await req.json()
    const { command, uri, contextUri, volumePercent } = body
    // Normalize deviceId to undefined if empty string or null
    const deviceId = body.deviceId || undefined

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
        if (volumePercent === undefined) {
          return NextResponse.json(
            { error: 'volumePercent must be provided for SET_VOLUME' },
            { status: 400 }
          )
        }
        await sdk.player.setPlaybackVolume(volumePercent, deviceId)
        break
      case 'TRANSFER_PLAYBACK':
        if (!deviceId) {
          return NextResponse.json(
            { error: 'Device ID is required for TRANSFER_PLAYBACK' },
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

    return NextResponse.json({ message: `Command ${command} processed` })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    const isHandled = await handleSpotifyApiError(error)

    if (isHandled) {
      const err = error as { status?: number }
      if (err?.status === 429) {
        return NextResponse.json(
          { error: 'Spotify API Rate Limit Exceeded' },
          { status: 429 }
        )
      }
      if (err?.status === 401) {
        return NextResponse.json(
          { error: 'Spotify Token Expired' },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { error: 'Spotify Service Unavailable' },
        { status: 503 }
      )
    }

    if (
      error instanceof SyntaxError &&
      /unexpected end of/i.test(error.message)
    ) {
      // The SDK throws a SyntaxError when parsing a 204 No Content response (empty body).
      // This is expected for successful playback control commands.
      return NextResponse.json({ message: 'Command processed (204)' })
    }

    console.error('Spotify control error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}

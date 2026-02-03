import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSpotifyApi } from '@/lib/spotify/sdk'
import { ApiError } from '@/lib/errors'
import { createSafeSpotifyApi } from '@/services/safeSpotifyApi'
import { handleSpotifyApiError } from '@/services/spotifyApiErrorHandling'

export async function POST(req: NextRequest) {
  try {
    const rawSdk = await getAuthenticatedSpotifyApi()
    const sdk = createSafeSpotifyApi(rawSdk)
    const body = await req.json()
    const { command, uri, contextUri, volume } = body
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
        if (volume === undefined) {
          return NextResponse.json(
            { error: 'Volume must be provided for SET_VOLUME' },
            { status: 400 }
          )
        }
        await sdk.player.setPlaybackVolume(volume, deviceId)
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

    await handleSpotifyApiError(error)

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

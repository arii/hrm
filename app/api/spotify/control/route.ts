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
    const { command, deviceId, uri, contextUri, volume } = body

    switch (command) {
      case 'PLAY':
        if (uri) {
          await sdk.player.startResumePlayback(
            deviceId || undefined,
            undefined,
            [uri]
          )
        } else if (contextUri) {
          await sdk.player.startResumePlayback(
            deviceId || undefined,
            contextUri
          )
        } else {
          await sdk.player.startResumePlayback(deviceId || undefined)
        }
        break
      case 'PAUSE':
        await sdk.player.pausePlayback(deviceId || undefined)
        break
      case 'NEXT':
        await sdk.player.skipToNext(deviceId || undefined)
        break
      case 'PREVIOUS':
        await sdk.player.skipToPrevious(deviceId || undefined)
        break
      case 'SET_VOLUME':
        if (volume === undefined) {
          return NextResponse.json(
            { error: 'Volume must be provided for SET_VOLUME' },
            { status: 400 }
          )
        }
        await sdk.player.setPlaybackVolume(volume, deviceId || undefined)
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

    // Call the error handler as expected by tests.
    // We provide a no-op for onTokenExpired since NextAuth handles token refresh automatically
    // when getAuthenticatedSpotifyApi() calls getServerSession(). If we are here, we likely
    // had a valid token at the start of the request.
    await handleSpotifyApiError(error, () => {})

    // Handle 204 No Content syntax error which might be thrown by SDK
    // TODO: Track upstream issue in spotify-web-api-ts-sdk regarding 204 responses
    if (
      error instanceof SyntaxError &&
      /unexpected end of/i.test(error.message)
    ) {
      return NextResponse.json({ message: 'Command processed (204)' })
    }

    console.error('Spotify control error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}

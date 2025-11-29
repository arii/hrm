// File: app/api/spotify/control/route.ts (Spotify Control REST Handler - Fallback)
/**
 * Spotify Control REST Handler - Fallback/Demonstration Endpoint
 * This route serves as a secure REST endpoint for external control or testing
 * but the primary control commands are sent via WebSocket.
 */
import { NextRequest, NextResponse } from 'next/server'
import { withValidation } from '@/lib/middleware/validation'
import { spotifyControlSchema } from '@/lib/validation/schemas'
import { z } from 'zod'
import { SpotifyApiService } from '@/services/spotifyApi'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

const handler = async (
  _req: NextRequest,
  body: z.infer<typeof spotifyControlSchema>
) => {
  const spotifyApiService = SpotifyApiService.getInstance()
  const sdk = spotifyApiService.getSdk()

  if (!sdk) {
    return NextResponse.json(
      { error: 'Spotify service not available' },
      { status: 503 }
    )
  }

  const { command, deviceId } = body

  try {
    await executeSdkCommand(sdk, command, deviceId)
    return NextResponse.json({
      success: true,
      message: `Command '${command}' executed.`,
    })
  } catch (error) {
    const err = error as { status?: number; message?: string }
    return NextResponse.json(
      {
        error: 'Spotify API error',
        details: err.message || 'Unknown Spotify error',
      },
      { status: err.status || 500 }
    )
  }
}

async function executeSdkCommand(sdk: SpotifyApi, command: z.infer<typeof spotifyControlSchema>['command'], deviceId?: string) {
    if (!deviceId) {
        return
    }
    switch (command) {
        case 'PLAY':
        await sdk.player.startResumePlayback(deviceId)
        break
        case 'PAUSE':
        await sdk.player.pausePlayback(deviceId)
        break
        case 'NEXT':
        await sdk.player.skipToNext(deviceId)
        break
        case 'PREVIOUS':
        await sdk.player.skipToPrevious(deviceId)
        break;
        case 'TRANSFER_PLAYBACK':
        if (deviceId) {
            await sdk.player.transferPlayback([deviceId])
        }
        break;
        case 'SET_VOLUME':
        // No-op for now in this simplified handler
        break;
    }
}

export const POST = withValidation(spotifyControlSchema, handler)

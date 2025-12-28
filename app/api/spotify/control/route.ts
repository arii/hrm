import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { withCsrfProtection } from '@/lib/middleware/csrf'
import { withValidation } from '@/lib/middleware/validation'
import { spotifyApi } from '@/lib/spotify'
import logger from '@/utils/logger'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

const controlSchema = z.object({
  command: z.enum([
    'PLAY',
    'PAUSE',
    'NEXT',
    'PREV',
    'SEEK',
    'SET_VOLUME',
    'SHUFFLE',
    'REPEAT',
  ]),
  deviceId: z.string().optional(),
  contextUri: z.string().optional(),
  positionMs: z.number().optional(),
  volumePercent: z.number().min(0).max(100).optional(),
  shuffleState: z.boolean().optional(),
  repeatState: z.enum(['off', 'track', 'context']).optional(),
})

type ControlRequestBody = z.infer<typeof controlSchema>

async function handler(req: NextRequest & { parsedBody: ControlRequestBody }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
  }

  const {
    command,
    deviceId,
    contextUri,
    positionMs,
    volumePercent,
    shuffleState,
    repeatState,
  } = req.parsedBody

  try {
    const sdk = spotifyApi(session.accessToken)

    let response: Response | undefined
    switch (command) {
      case 'PLAY':
        response = await sdk.player.startResumePlayback(
          deviceId,
          contextUri,
          undefined, // uris
          positionMs
        )
        break
      case 'PAUSE':
        response = await sdk.player.pausePlayback(deviceId)
        break
      case 'NEXT':
        response = await sdk.player.skipToNext(deviceId)
        break
      case 'PREV':
        response = await sdk.player.skipToPrevious(deviceId)
        break
      case 'SEEK':
        response = await sdk.player.seekToPosition(positionMs!, deviceId)
        break
      case 'SET_VOLUME':
        response = await sdk.player.setPlaybackVolume(volumePercent!, deviceId)
        break
      case 'SHUFFLE':
        response = await sdk.player.togglePlaybackShuffle(shuffleState!, deviceId)
        break
      case 'REPEAT':
        response = await sdk.player.setRepeatMode(repeatState!, deviceId)
        break
      default:
        return NextResponse.json(
          { error: `Invalid command: ${command}` },
          { status: 400 }
        )
    }

    if (response?.ok) {
      return NextResponse.json({ success: true })
    } else {
      const errorBody = response ? await response.json() : { error: { message: 'Unknown Spotify error' } }
      logger.error('Spotify API Error:', { status: response?.status, body: errorBody })
      return NextResponse.json(
        { error: 'Spotify API error', details: errorBody?.error?.message },
        { status: response?.status || 500 }
      )
    }
  } catch (error) {
    logger.error('Error controlling Spotify playback:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrfProtection(withValidation(controlSchema, handler))

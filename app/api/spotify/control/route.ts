// File: app/api/spotify/control/route.ts
import { validateSession } from '@/lib/api/session'
import { getSpotifyClient } from '@/lib/api/spotify'
import { successResponse, errorResponse } from '@/lib/api/response'
import { withValidation } from '@/lib/middleware/validation'
import { spotifyControlSchema } from '@/lib/validation/schemas'
import { NextRequest } from 'next/server'
import { z } from 'zod'

async function handler(
  _req: NextRequest,
  body: z.infer<typeof spotifyControlSchema>
) {
  try {
    const session = await validateSession()
    const spotify = getSpotifyClient(session)
    const { command } = body

    switch (command) {
      case 'PLAY':
        await spotify.player.startResumePlayback()
        break
      case 'NEXT':
        await spotify.player.skipToNext()
        break
      case 'PREVIOUS':
        await spotify.player.skipToPrevious()
        break
    }

    return successResponse({ message: `Command '${command}' executed.` })
  } catch (error) {
    return errorResponse(error)
  }
}

export const POST = withValidation(spotifyControlSchema, handler)

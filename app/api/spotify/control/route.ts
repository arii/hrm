// File: app/api/spotify/control/route.ts (Refactored)
/**
 * Spotify Control REST Handler - Fallback/Demonstration Endpoint
 * This route serves as a secure REST endpoint for external control or testing
 * but the primary control commands are sent via WebSocket.
 */
import { NextRequest, NextResponse } from 'next/server'
import { withValidation } from '@/lib/middleware/validation'
import { spotifyControlSchema } from '@/lib/validation/schemas'
import { sendPlayerCommand } from '@/services/spotifyApiService'
import { z } from 'zod'

const handler = async (
  _req: NextRequest,
  body: z.infer<typeof spotifyControlSchema>
) => {
  const result = await sendPlayerCommand(
    body.command,
    body.deviceId,
    body.volume
  )

  if (result.success) {
    return NextResponse.json(result.data)
  } else {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
}

export const POST = withValidation(spotifyControlSchema, handler)

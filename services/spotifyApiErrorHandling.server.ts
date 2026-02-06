import { NextResponse } from 'next/server'
import { logSpotifyApiError } from './spotifyErrorLogging.server.js'

// Re-export command logger for convenience, though direct import is preferred to avoid side-effects
export { logSpotifyCommandError } from './spotifyErrorLogging.server.js'

export function handleSpotifyApiError(error: unknown): NextResponse {
  // Log the error using the shared logging logic
  logSpotifyApiError(error)

  const spotifyError = error as {
    status?: number
    message?: string
    cause?: { reason?: string }
  }

  if (spotifyError && spotifyError.status) {
    // Handle specific error reasons
    if (
      spotifyError.message?.includes('NO_ACTIVE_DEVICE') ||
      spotifyError.status === 404
    ) {
      return NextResponse.json(
        {
          error: 'No active device found.',
          details: 'Please start playback on a Spotify device.',
        },
        { status: 404 }
      )
    }

    if (spotifyError.status === 401) {
      return NextResponse.json(
        { error: 'Authentication failed', details: 'Invalid access token.' },
        { status: 401 }
      )
    }

    if (spotifyError.status === 403) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          details: 'You do not have the necessary permissions for this action.',
        },
        { status: 403 }
      )
    }

    // Generic Spotify error
    return NextResponse.json(
      {
        error: 'Spotify API error',
        details: spotifyError.message || 'An unknown error occurred.',
      },
      { status: spotifyError.status || 500 }
    )
  }

  return NextResponse.json(
    {
      error: 'Internal server error',
      details:
        error instanceof Error ? error.message : 'An unknown error occurred.',
    },
    { status: 500 }
  )
}

import logger from '../utils/logger.server.js'
import { NextResponse } from 'next/server'

// Utility: Safely parse JSON, fallback to text
function safeParseJSON(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return input // Return raw text if not JSON
  }
}

/**
 * Parses and logs detailed error information from a failed Spotify SDK command.
 * It handles different error shapes, including JSON bodies and plain text.
 * @param command The name of the command that failed (for logging).
 * @param error The error object caught.
 */
export async function logSpotifyCommandError(
  command: string,
  error: unknown
): Promise<void> {
  try {
    const errObj = error as { message?: string; status?: number }

    // Check for "No active device" error (404)
    if (
      (errObj?.message &&
        (errObj.message.includes('NO_ACTIVE_DEVICE') ||
          errObj.message.includes('Device not found'))) ||
      errObj?.status === 404
    ) {
      logger.warn(
        { command },
        'Spotify command failed: No active device found. Playback cannot be controlled.'
      )
      return
    }

    if (error instanceof SyntaxError) {
      logger.warn(
        { command },
        'Command executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.'
      )
      return
    }

    // Log error with response body if available
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (
        error as { response?: { text?: () => Promise<string> } }
      ).response
      if (response && typeof response.text === 'function') {
        try {
          const text = await response.text()
          const parsed = safeParseJSON(text)
          logger.error(
            { command, response: parsed },
            'Error executing Spotify command'
          )
          return
        } catch (e) {
          logger.error(
            { command, err: e },
            'Could not read response body for failed Spotify command'
          )
          return
        }
      }
    }

    // Default error logging
    logger.error({ command, err: error }, 'Error executing Spotify command')
  } catch (loggingError) {
    logger.error(
      { command, err: loggingError },
      'Error in logSpotifyCommandError'
    )
    logger.error({ command, originalError: error }, 'Original error')
  }
}

export function handleSpotifyApiError(error: unknown): NextResponse {
  const spotifyError = error as { status?: number; message?: string; cause?: { reason?: string } };

  if (spotifyError && spotifyError.status) {
    logger.error(
      {
        status: spotifyError.status,
        message: spotifyError.message,
        reason: spotifyError.cause?.reason,
      },
      'Spotify API Error'
    );

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
      );
    }

    if (spotifyError.status === 401) {
      return NextResponse.json(
        { error: 'Authentication failed', details: 'Invalid access token.' },
        { status: 401 }
      );
    }

    if (spotifyError.status === 403) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          details:
            'You do not have the necessary permissions for this action.',
        },
        { status: 403 }
      );
    }

    // Generic Spotify error
    return NextResponse.json(
      {
        error: 'Spotify API error',
        details: spotifyError.message || 'An unknown error occurred.',
      },
      { status: spotifyError.status || 500 }
    );
  }

  // Handle non-SDK errors
  logger.error({ error }, 'Internal Server Error');
  return NextResponse.json(
    {
      error: 'Internal server error',
      details:
        error instanceof Error ? error.message : 'An unknown error occurred.',
    },
    { status: 500 }
  );
}

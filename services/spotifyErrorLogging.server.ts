import logger from '../utils/logger.server'

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

/**
 * Logs a Spotify API error without returning a response.
 * Useful for background services that don't respond to HTTP requests.
 * @param error The error object.
 */
export function logSpotifyApiError(error: unknown): void {
  const spotifyError = error as {
    status?: number
    message?: string
    cause?: { reason?: string }
  }

  if (spotifyError && spotifyError.status) {
    logger.error(
      {
        status: spotifyError.status,
        message: spotifyError.message,
        reason: spotifyError.cause?.reason,
      },
      'Spotify API Error'
    )
    return
  }

  // Handle non-SDK errors
  logger.error({ error }, 'Internal Server Error')
}

import logger from '../utils/logger'

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
    if (error instanceof SyntaxError) {
      logger.warn(
        { command },
        'Command executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.'
      )
      return
    }

    if (error && typeof error === 'object') {
      if (
        'response' in error &&
        (error as { response?: { text?: () => Promise<string> } }).response
      ) {
        try {
          let text = '[No response text available]'
          if (
            typeof (error as { response: { text?: unknown } }).response.text ===
            'function'
          ) {
            text = await (
              error as { response: { text: () => Promise<string> } }
            ).response.text()
          }
          const parsed = safeParseJSON(text)
          logger.error(
            { command, response: parsed },
            'Error executing Spotify command'
          )
        } catch (e) {
          logger.error(
            { command, err: e },
            'Could not read response body for failed Spotify command'
          )
        }
      } else {
        logger.error({ command, err: error }, 'Error executing Spotify command')
      }
    } else {
      logger.error({ command, err: error }, 'Error executing Spotify command')
    }
  } catch (loggingError) {
    logger.error(
      { command, err: loggingError },
      'Error in logSpotifyCommandError'
    )
    logger.error({ command, originalError: error }, 'Original error')
  }
}

/**
 * Handles errors during the `getCurrentlyPlaying` poll.
 * Differentiates between rate limiting (429), token expiration (401),
 * and other errors.
 *
 * @param error The caught error object.
 * @param onTokenExpired A callback to trigger a token refresh.
 * @returns {boolean} - Returns true if the error was handled (e.g., rate limit, auth), false otherwise.
 */
export async function handleSpotifyApiError(
  error: unknown,
  onTokenExpired: () => void
): Promise<boolean> {
  const err = error as {
    status?: number
    response?: { text: () => Promise<string> }
  }

  if (err?.status === 429) {
    logger.warn('Spotify API Rate Limited. Backing off...')
    return true // Handled
  }

  if (err?.status === 401) {
    logger.warn('Spotify token expired during polling. Attempting refresh.')
    onTokenExpired()
    return true // Handled
  }

  // For other errors, log the response if available
  if (err?.response && typeof err.response.text === 'function') {
    const text = await err.response.text()
    const parsed = safeParseJSON(text)
    logger.error(
      { response: parsed },
      'Unhandled Spotify API error during polling'
    )
  } else {
    logger.error({ err: error }, 'Error fetching currently playing track')
  }
  return false // Not a specifically handled API error
}

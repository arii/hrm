import logger from '../utils/logger.js'

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
 * @returns {Promise<boolean>} - Returns true if the error was handled (e.g., rate limit, auth), false otherwise.
 */
export async function handleSpotifyApiError(
  error: unknown,
  onTokenExpired: () => void
): Promise<boolean> {
  const err = error as {
    status?: number
    response?: { text: () => Promise<string> }
    message?: string
  }

  const status = err?.status

  // Always log the original error for full context in debug logs
  logger.debug({ err: error }, 'Spotify API Error encountered')

  switch (status) {
    case 401:
      logger.warn('Spotify token expired during polling. Attempting refresh.')
      onTokenExpired()
      return true // Handled
    case 429:
      logger.warn('Spotify API Rate Limited. Backing off.')
      return true // Handled
    case 400:
    case 403:
    case 404:
      logger.error(
        { status, message: err.message },
        'Spotify API returned a client-side error. This may indicate a bug or configuration issue.'
      )
      break
    case 500:
    case 502:
    case 503:
      logger.warn(
        { status, message: err.message },
        'Spotify API returned a server-side error. Service may be temporarily unavailable.'
      )
      return true // Handled as a transient error
    default:
      // Handle non-HTTP errors (e.g., network issues) or unhandled statuses
      if (err?.response && typeof err.response.text === 'function') {
        const text = await err.response.text()
        const parsed = safeParseJSON(text)
        logger.error(
          { status, response: parsed },
          'Unhandled Spotify API error during polling'
        )
      } else {
        logger.error(
          { err: error, message: err?.message },
          'An unexpected error occurred during Spotify polling (e.g., network issue)'
        )
      }
      break
  }
  return false // Not a specifically handled API error
}

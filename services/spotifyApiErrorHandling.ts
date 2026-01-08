import logger from '../utils/logger'
import { ERROR_MESSAGES } from '../lib/errors'

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
      logger.warn({ command }, ERROR_MESSAGES.SPOTIFY_NO_ACTIVE_DEVICE)
      return
    }

    if (error instanceof SyntaxError) {
      logger.warn({ command }, ERROR_MESSAGES.SPOTIFY_SYNTAX_ERROR)
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
            ERROR_MESSAGES.SPOTIFY_CMD_EXEC_ERROR
          )
        } catch (e) {
          logger.error(
            { command, err: e },
            ERROR_MESSAGES.SPOTIFY_CMD_RESPONSE_ERROR
          )
        }
      } else {
        logger.error(
          { command, err: error },
          ERROR_MESSAGES.SPOTIFY_CMD_EXEC_ERROR
        )
      }
    } else {
      logger.error(
        { command, err: error },
        ERROR_MESSAGES.SPOTIFY_CMD_EXEC_ERROR
      )
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
    logger.warn(ERROR_MESSAGES.SPOTIFY_RATE_LIMITED)
    return true // Handled
  }

  if (err?.status === 401) {
    logger.warn(ERROR_MESSAGES.SPOTIFY_TOKEN_EXPIRED)
    onTokenExpired()
    return true // Handled
  }

  // Check for network errors
  const errMsg = (error as { message?: string })?.message || ''
  if (
    errMsg.includes('fetch failed') ||
    errMsg.includes('EAI_AGAIN') ||
    errMsg.includes('ENETUNREACH') ||
    errMsg.includes('ECONNREFUSED')
  ) {
    logger.warn({ err: error }, ERROR_MESSAGES.SPOTIFY_POLLING_NETWORK_ERROR)
    return true // Handled (suppressed)
  }

  // For other errors, log the response if available
  if (err?.response && typeof err.response.text === 'function') {
    const text = await err.response.text()
    const parsed = safeParseJSON(text)
    logger.error(
      { response: parsed },
      ERROR_MESSAGES.SPOTIFY_POLLING_UNHANDLED_ERROR
    )
  } else {
    logger.error({ err: error }, ERROR_MESSAGES.SPOTIFY_FETCH_TRACK_ERROR)
  }
  return false // Not a specifically handled API error
}

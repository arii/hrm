import logger from '../utils/logger.js'
import { SpotifyApiError } from '../lib/errors.js'

/**
 * Safely parses a string into a JSON object. If parsing fails, it returns the original string.
 * @param input The string to parse.
 * @returns The parsed JSON object or the original string.
 */
function safeParseJSON(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return input // Return raw text if not JSON
  }
}

/**
 * Parses detailed error information from a failed Spotify SDK command and logs it.
 * This function is intended for commands where failure is not necessarily critical,
 * and we primarily want to log the issue for debugging. It does not throw.
 *
 * @param command The name of the command that failed.
 * @param error The error object caught.
 */
export async function logSpotifyCommandError(
  command: string,
  error: unknown
): Promise<void> {
  // Suppress SyntaxError for 204 No Content responses, which are expected
  if (error instanceof SyntaxError) {
    logger.warn(
      { command },
      'Command executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.'
    )
    return
  }

  let errorMessage = 'An unknown error occurred.'
  let statusCode: number | undefined
  let responseBody: unknown = null

  if (error instanceof SpotifyApiError) {
    errorMessage = error.message
    statusCode = error.statusCode
  } else if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as { response?: unknown }).response
  ) {
    const err = error as {
      status?: number
      response: { text?: () => Promise<string> }
    }
    statusCode = err.status
    if (typeof err.response.text === 'function') {
      try {
        const text = await err.response.text()
        responseBody = safeParseJSON(text)
        errorMessage = text
      } catch (e) {
        errorMessage = 'Failed to read response body from Spotify error.'
      }
    }
  } else if (error instanceof Error) {
    errorMessage = error.message
  }

  logger.error(
    {
      command,
      error: {
        message: errorMessage,
        statusCode,
        response: responseBody,
        originalError: error,
      },
    },
    `Error executing Spotify command '${command}'.`
  )
}

/**
 * Handles errors during the `getCurrentlyPlaying` poll by wrapping them in a standardized error.
 * This function inspects the error and throws a specific `SpotifyApiError` for upstream handling.
 *
 * @param error The caught error object.
 * @throws {SpotifyApiError} - A standardized error containing the status code and message.
 */
export async function handleSpotifyApiError(error: unknown): Promise<void> {
  const err = error as {
    status?: number
    response?: { text: () => Promise<string> }
  }

  let message = 'An unknown error occurred during Spotify polling.'
  const status = err?.status ?? 500

  if (status === 401) {
    message = 'Spotify token is expired or invalid.'
  } else if (status === 429) {
    message = 'Spotify API rate limit exceeded.'
  } else if (err?.response && typeof err.response.text === 'function') {
    try {
      const text = await err.response.text()
      const parsed = safeParseJSON(text)
      if (
        parsed &&
        typeof parsed === 'object' &&
        'error' in parsed &&
        typeof (parsed as { error: { message?: string } }).error.message ===
          'string'
      ) {
        message = (parsed as { error: { message: string } }).error.message
      } else {
        message = text
      }
    } catch (e) {
      message = 'Failed to parse error response from Spotify.'
    }
  } else if (error instanceof Error) {
    message = error.message
  }

  // Always throw a standardized error from polling failures.
  // The caller can then decide how to handle it (e.g., log, refresh token, stop polling).
  throw new SpotifyApiError(message, status)
}

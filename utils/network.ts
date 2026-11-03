// utils/network.ts
import { withBasePath } from './urls'

/**
 * Standardized error schema for the application.
 * This ensures consistent error handling and reporting.
 */
export interface AppError {
  code: string // e.g., 'NETWORK_TIMEOUT', 'FETCH_ABORTED', 'HTTP_ERROR_401'
  message: string // Human-readable message
  retryable: boolean // Indicates if the operation can be retried
  originalError?: unknown // The original error object for debugging
}

// Custom error class to distinguish timeouts
class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Maps a fetch failure to the standardized AppError schema.
 * Pure classifier shared by every retry attempt.
 */
const classifyFetchError = (
  error: unknown,
  callerAborted: boolean | undefined
): AppError => {
  if (callerAborted) {
    return {
      code: 'FETCH_ABORTED',
      message: 'Request was aborted by the caller.',
      retryable: false,
      originalError: error,
    }
  }
  if (error instanceof TimeoutError) {
    return {
      code: 'NETWORK_TIMEOUT',
      message: 'The request timed out.',
      retryable: true,
      originalError: error,
    }
  }
  if (error instanceof Error && error.message.startsWith('HTTP Error:')) {
    const status = (error.cause as { status: number }).status
    return {
      code: `HTTP_ERROR_${status}`,
      message: `Request failed with status ${status}.`,
      retryable: status >= 500, // Only retry on 5xx server errors
      originalError: error,
    }
  }
  return {
    code: 'NETWORK_ERROR',
    message:
      error instanceof Error
        ? error.message
        : 'An unknown network error occurred.',
    retryable: true,
    originalError: error,
  }
}

/**
 * A wrapper around the native fetch API with retry logic and error handling.
 *
 * @param url The URL to fetch.
 * @param options The fetch options, including an AbortSignal from the caller.
 * @param retries The number of times to retry the request on failure.
 * @param timeout The timeout for each request attempt in milliseconds.
 * @returns The response from the fetch request.
 * @throws {AppError} Throws a standardized AppError on failure.
 */
export const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  retries = 3,
  timeout = 8000
): Promise<Response> => {
  let lastError: AppError | undefined

  for (let attempt = 1; attempt <= retries; attempt++) {
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(
      () => timeoutController.abort(new TimeoutError(`Request timed out`)),
      timeout
    )

    // Combine the caller's signal with the timeout signal
    const signals = [timeoutController.signal]
    if (options.signal) {
      signals.push(options.signal)
    }
    const combinedSignal = AbortSignal.any(signals)

    try {
      // Exit early if the caller's signal is already aborted
      if (options.signal?.aborted) {
        throw options.signal.reason || new Error('Request aborted by caller')
      }

      // Route app API calls inside the serving subpath (no-op at root,
      // idempotent for already-prefixed or absolute URLs).
      const response = await fetch(withBasePath(url), {
        ...options,
        signal: combinedSignal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // Throw a structured error for HTTP failures
        const errorPayload = {
          status: response.status,
          statusText: response.statusText,
          body: await response.text().catch(() => 'Could not read body'),
        }
        throw new Error(`HTTP Error: ${response.status}`, {
          cause: errorPayload,
        })
      }

      return response // Success
    } catch (error: unknown) {
      clearTimeout(timeoutId)
      lastError = classifyFetchError(error, options.signal?.aborted)

      // If the error is not retryable, or we are on the last attempt, break the loop
      if (!lastError.retryable || attempt === retries) {
        break
      }

      // Wait before the next attempt
      const delay = 500 * Math.pow(2, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // After the loop, if lastError is set, throw it.
  throw (
    lastError ?? {
      code: 'UNKNOWN_FAILURE',
      message: 'The request failed for an unknown reason.',
      retryable: false,
    }
  )
}

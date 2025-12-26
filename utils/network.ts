// utils/network.ts

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
 * A robust wrapper around the native fetch API with retry logic.
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

      const response = await fetch(url, {
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

      // Check if the caller aborted the request
      if (options.signal?.aborted) {
        lastError = {
          code: 'FETCH_ABORTED',
          message: 'Request was aborted by the caller.',
          retryable: false,
          originalError: error,
        }
        break // Break the loop immediately if aborted by caller
      }

      // Check for timeout
      if (error instanceof TimeoutError) {
        lastError = {
          code: 'NETWORK_TIMEOUT',
          message: 'The request timed out.',
          retryable: true,
          originalError: error,
        }
      }
      // Check for HTTP errors
      else if (error instanceof Error && error.message.startsWith('HTTP Error:')) {
        const status = (error.cause as { status: number }).status
        lastError = {
          code: `HTTP_ERROR_${status}`,
          message: `Request failed with status ${status}.`,
          retryable: status >= 500, // Only retry on 5xx server errors
          originalError: error,
        }
      }
      // Handle other generic network errors
      else {
        lastError = {
          code: 'NETWORK_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'An unknown network error occurred.',
          retryable: true,
          originalError: error,
        }
      }

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

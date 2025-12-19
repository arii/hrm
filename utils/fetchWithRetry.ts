/**
 * A utility function that wraps the native `fetch` API to provide a resilient retry
 * mechanism with exponential backoff and jitter. This is useful for making API
 * calls more robust against transient network failures.
 */

// --- Configuration ---
const MAX_RETRIES = 5
const INITIAL_DELAY_MS = 1000
const JITTER_FACTOR = 0.2 // 20% jitter

// --- Helper Functions ---
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Checks if a given HTTP status code is retryable.
 * We should only retry on server errors (5xx) or network-related issues,
 * not on client errors (4xx) which are unlikely to resolve on their own.
 * @param status The HTTP status code.
 * @returns True if the status is retryable, false otherwise.
 */
const isRetryableStatus = (status: number): boolean => {
  return status >= 500
}

/**
 * A wrapper around the native `fetch` function that adds a retry mechanism.
 *
 * @param url The URL to fetch.
 * @param options The options to pass to the `fetch` call.
 * @param retries The number of retries remaining.
 * @returns A promise that resolves to the `Response` object.
 * @throws An error if the request fails after all retries.
 */
export const fetchWithRetry = async (
  url: RequestInfo | URL,
  options?: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> => {
  try {
    const response = await fetch(url, options)

    // If the response is successful, return it immediately.
    if (response.ok) {
      return response
    }

    // If the response has a non-retryable status, throw an error.
    if (!isRetryableStatus(response.status)) {
      throw new Error(`Request failed with status ${response.status}`)
    }

    // If we have retries left, attempt to retry.
    if (retries > 0) {
      // Calculate the delay with exponential backoff and jitter.
      const delay =
        INITIAL_DELAY_MS * 2 ** (MAX_RETRIES - retries) * (1 + Math.random() * JITTER_FACTOR)
      await sleep(delay)
      return fetchWithRetry(url, options, retries - 1)
    }

    // If all retries have been exhausted, throw an error.
    throw new Error('Request failed after multiple retries')
  } catch (error) {
    // If the error is not a network error, re-throw it immediately.
    if (!(error instanceof TypeError && error.message === 'Failed to fetch')) {
      throw error
    }

    // If we have retries left, attempt to retry.
    if (retries > 0) {
      const delay =
        INITIAL_DELAY_MS * 2 ** (MAX_RETRIES - retries) * (1 + Math.random() * JITTER_FACTOR)
      await sleep(delay)
      return fetchWithRetry(url, options, retries - 1)
    }

    // If all retries have been exhausted, throw the final error.
    throw error
  }
}

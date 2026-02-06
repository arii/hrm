// utils/network.ts

export class HttpError extends Error {
  status: number

  constructor(status: number, message?: string) {
    super(message || `HTTP Error: ${status}`)
    this.name = 'HttpError'
    this.status = status
  }
}

export const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  retries = 3,
  timeout = 8000
): Promise<Response> => {
  let lastError: unknown

  for (let i = 0; i < retries; i++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // Use AbortSignal.any if available (modern envs), otherwise manual merge
    const abortSignalClass = AbortSignal as unknown as {
      any: (signals: Iterable<AbortSignal>) => AbortSignal
    }

    const abortSignal =
      typeof abortSignalClass.any === 'function'
        ? abortSignalClass.any(
            [controller.signal, options.signal].filter(Boolean) as AbortSignal[]
          )
        : undefined

    let onUserAbort: (() => void) | undefined

    if (!abortSignal && options.signal) {
      // Fallback manual merge
      if (options.signal.aborted) {
        clearTimeout(timeoutId)
        throw options.signal.reason || new Error('Aborted')
      }
      onUserAbort = () => controller.abort()
      options.signal.addEventListener('abort', onUserAbort)
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: abortSignal || controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        // Only retry on 5xx (server errors) or 429 (too many requests)
        const isRetryable = response.status >= 500 || response.status === 429
        if (!isRetryable) {
          throw new HttpError(response.status)
        }
        // Throw to trigger retry loop
        throw new HttpError(response.status)
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)

      // If the user aborted, rethrow immediately
      if (options.signal?.aborted) {
        throw options.signal.reason || error
      }

      lastError = error

      // Check if we should stop retrying
      const isLastAttempt = i === retries - 1

      // Don't retry if it's a non-retryable HttpError (re-thrown above)
      if (error instanceof HttpError) {
        const isRetryable = error.status >= 500 || error.status === 429
        if (!isRetryable) throw error
      }

      if (!isLastAttempt) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * Math.pow(2, i))
        )
      }
    } finally {
      // Cleanup listener if we used manual merge
      if (onUserAbort && options.signal) {
        options.signal.removeEventListener('abort', onUserAbort)
      }
    }
  }

  throw lastError
}

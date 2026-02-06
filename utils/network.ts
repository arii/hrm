// utils/network.ts

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

    // Manually merge signals if AbortSignal.any is not available or we want guaranteed safety
    // This listener ensures that if the user aborts, we abort our internal controller
    const onUserAbort = () => controller.abort()
    if (options.signal) {
      if (options.signal.aborted) {
        // Already aborted
        clearTimeout(timeoutId)
        throw options.signal.reason || new Error('Aborted')
      }
      options.signal.addEventListener('abort', onUserAbort)
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        // Only retry on 5xx (server errors) or 429 (too many requests)
        const isRetryable = response.status >= 500 || response.status === 429
        if (!isRetryable) {
          throw new Error(`HTTP Error: ${response.status}`)
        }
        // If retryable, throw to trigger the catch block and retry loop
        throw new Error(`HTTP Error: ${response.status}`)
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)

      // If the user aborted, rethrow immediately
      if (options.signal?.aborted) {
        throw options.signal.reason || error
      }

      lastError = error

      // Don't retry if the specific error was our timeout (unless we want to retry on timeout,
      // which is usually good, but let's check strictness. The prompt asked to retry on 500s.
      // Usually retrying on network timeout is desirable.)

      // Check if we should stop retrying
      const isLastAttempt = i === retries - 1

      // If it's a non-retryable HTTP error (already handled above by rethrowing only if retryable),
      // we need to distinguish it. But wait, I threw generic Error above.
      // Let's refine the logic: inside the try, if !ok and !retryable, RETURN or THROW a special error?
      // Actually, if !ok and !retryable, I should probably throw an error that I catch and rethrow immediately.

      if (error instanceof Error && error.message.startsWith('HTTP Error:')) {
        const statusStr = error.message.split(': ')[1]
        const status = parseInt(statusStr || '0', 10)
        const isRetryable = status >= 500 || status === 429
        if (!isRetryable) throw error
      }

      if (!isLastAttempt) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * Math.pow(2, i))
        )
      }
    } finally {
      // Cleanup listener
      if (options.signal) {
        options.signal.removeEventListener('abort', onUserAbort)
      }
    }
  }

  throw lastError
}

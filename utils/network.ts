// utils/network.ts

export const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  retries = 3,
  timeout = 8000
): Promise<Response> => {
  let lastError: unknown

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      // Use a type-safe check for AbortSignal.any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const abortSignalClass = AbortSignal as any

      const signal =
        typeof abortSignalClass.any === 'function'
          ? abortSignalClass.any(
              [controller.signal, options.signal].filter(Boolean)
            )
          : controller.signal

      const response = await fetch(url, { ...options, signal })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      lastError = error
      if (options.signal?.aborted) throw error // Don't retry if aborted by user

      const isLastAttempt = i === retries - 1
      if (!isLastAttempt) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * Math.pow(2, i))
        )
      }
    }
  }

  throw lastError
}

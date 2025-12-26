// hooks/useFetchWithRetry.ts
import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchWithRetry, AppError } from '@/utils/network'

interface UseFetchState<T> {
  data: T | null
  error: AppError | null
  isLoading: boolean
}

interface FetchOptions extends RequestInit {
  retries?: number
  timeout?: number
}

/**
 * A custom hook to fetch data with retry logic and lifecycle management.
 *
 * @param url The URL to fetch.
 * @param options The fetch options.
 * @returns An object with data, error, isLoading, and an execute function.
 */
export const useFetchWithRetry = <T>(
  url: string,
  options: FetchOptions = {}
) => {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    error: null,
    isLoading: false,
  })

  // Use a ref to manage the AbortController for the component's lifecycle
  const componentAbortControllerRef = useRef<AbortController | null>(null)

  const execute = useCallback(async () => {
    // Ensure we have a fresh controller for each execution
    if (!componentAbortControllerRef.current) {
      componentAbortControllerRef.current = new AbortController()
    }

    setState({ data: null, error: null, isLoading: true })

    try {
      const { retries, timeout, ...fetchOpts } = options
      const response = await fetchWithRetry(
        url,
        // Pass the component's signal to the fetch utility
        { ...fetchOpts, signal: componentAbortControllerRef.current.signal },
        retries,
        timeout
      )
      const data = await response.json()
      setState({ data, error: null, isLoading: false })
    } catch (error) {
      // The error is already an AppError, so we can just cast it
      const appError = error as AppError
      // Only set the error if it wasn't due to a component unmount
      if (appError.code !== 'FETCH_ABORTED') {
        setState({ data: null, error: appError, isLoading: false })
      }
    }
  }, [url, options])

  // Effect to set up and tear down the AbortController
  useEffect(() => {
    componentAbortControllerRef.current = new AbortController()
    // Cleanup function to abort the request when the component unmounts
    return () => {
      componentAbortControllerRef.current?.abort()
    }
  }, []) // Empty dependency array ensures this runs once on mount and cleanup on unmount

  return { ...state, execute }
}

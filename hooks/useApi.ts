// hooks/useApi.ts
'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/context/ToastContext'

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface ApiOptions<T> {
  method?: ApiMethod
  headers?: Record<string, string>
  body?: T
}

interface UseApiReturn<T, U> {
  data: T | null
  error: Error | null
  isLoading: boolean
  request: (url: string, options?: ApiOptions<U>) => Promise<T | void>
}

const useApi = <T, U = unknown>(): UseApiReturn<T, U> => {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { addToast } = useToast()

  const request = useCallback(
    async (url: string, options: ApiOptions<U> = {}) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: options.body ? JSON.stringify(options.body) : null,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Error: ${response.statusText}`)
        }

        const result: T = await response.json()
        setData(result)
        return result
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred'
        setError(err instanceof Error ? err : new Error(errorMessage))
        addToast(errorMessage, 'error')
      } finally {
        setIsLoading(false)
      }
    },
    [addToast]
  )

  return { data, error, isLoading, request }
}

export default useApi

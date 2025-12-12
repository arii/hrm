'use client'

import { useCallback } from 'react'
import { useLoading } from '@/context/LoadingContext'

export const useApi = () => {
  const { startLoading, stopLoading } = useLoading()

  const apiFetch = useCallback(
    async <T>(url: string, options?: RequestInit): Promise<T> => {
      startLoading()
      try {
        const response = await fetch(url, options)
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`)
        }
        const data: T = await response.json()
        return data
      } catch (error) {
        console.error('API request failed:', error)
        throw error
      } finally {
        stopLoading()
      }
    },
    [startLoading, stopLoading]
  )

  return { apiFetch }
}

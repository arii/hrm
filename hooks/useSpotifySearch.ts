// File: hooks/useSpotifySearch.ts
'use client'

import { useState, useCallback } from 'react'
import { Track } from '@spotify/web-api-ts-sdk'

interface SpotifySearchState {
  results: Track[]
  loading: boolean
  error: string | null
}

export const useSpotifySearch = () => {
  const [searchState, setSearchState] = useState<SpotifySearchState>({
    results: [],
    loading: false,
    error: null,
  })

  const searchTracks = useCallback(async (query: string) => {
    if (!query) {
      setSearchState({ results: [], loading: false, error: null })
      return
    }

    setSearchState((prevState) => ({ ...prevState, loading: true, error: null }))

    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch search results')
      }
      const data: Track[] = await response.json()
      setSearchState({ results: data, loading: false, error: null })
    } catch (err) {
      console.error('Spotify search error:', err)
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setSearchState({ results: [], loading: false, error: errorMessage })
    }
  }, [])

  const clearSearch = useCallback(() => {
    setSearchState({ results: [], loading: false, error: null })
  }, [])

  return { ...searchState, searchTracks, clearSearch }
}

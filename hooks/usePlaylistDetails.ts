// hooks/usePlaylistDetails.ts
import { useState, useEffect } from 'react'
import { PlaylistDetailsData } from '@/types/spotify'

/**
 * Custom hook to fetch details for a single Spotify playlist.
 * It manages loading, error, and data states, and handles component unmounting.
 * @param playlistUri The URI of the playlist to fetch.
 * @returns An object containing the playlist data, loading state, and any error information.
 */
export const usePlaylistDetails = (playlistUri: string | null) => {
  const [data, setData] = useState<PlaylistDetailsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!playlistUri) {
      setData(null)
      return
    }

    const controller = new AbortController()
    const { signal } = controller

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setData(null)

      try {
        const playlistId = playlistUri.split(':').pop()
        if (!playlistId) {
          throw new Error('Invalid playlist URI')
        }

        const response = await fetch(`/api/spotify/playlists/${playlistId}`, {
          signal,
        })

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              'Playlist not found. It might be private or deleted.'
            )
          } else {
            throw new Error(
              `Failed to fetch playlist details, status: ${response.status}`
            )
          }
        }

        const result = await response.json()
        if (!signal.aborted) {
          setData(result)
        }
      } catch (err) {
        if (!signal.aborted) {
          const message =
            err instanceof Error ? err.message : 'An unknown error occurred'
          setError(message)
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      controller.abort()
    }
  }, [playlistUri])

  return { data, loading, error }
}

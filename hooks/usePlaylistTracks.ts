import { useCallback, useState } from 'react'
import { SpotifyPlaylistItem as Track } from '@/types/core'

interface UsePlaylistTracksProps {
  playlistId: string
  limit?: number
}

interface FetchTracksResult {
  tracks: Track[]
  total: number
}

interface UsePlaylistTracksReturn {
  loading: boolean
  error: string | null
  fetchTracks: (offset: number) => Promise<FetchTracksResult>
}

export const usePlaylistTracks = ({
  playlistId,
  limit = 20,
}: UsePlaylistTracksProps): UsePlaylistTracksReturn => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTracks = useCallback(
    async (offset: number): Promise<FetchTracksResult> => {
      if (!playlistId) return { tracks: [], total: 0 }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/spotify/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to fetch tracks')
        }

        const data = await response.json()

        // Ensure data integrity
        const tracks = data.tracks || []
        const total = data.total || 0

        return { tracks, total }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unknown error occurred'
        setError(message)
        // Return empty result on error so component doesn't break,
        // but state will reflect error
        return { tracks: [], total: 0 }
      } finally {
        setLoading(false)
      }
    },
    [playlistId, limit]
  )

  return {
    loading,
    error,
    fetchTracks,
  }
}

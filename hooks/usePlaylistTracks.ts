import { useState, useCallback, useEffect } from 'react'
import { SpotifyPlaylistItem as Track } from '@/types/core'

interface UsePlaylistTracksOptions {
  limit?: number
  mode?: 'append' | 'replace'
}

export const usePlaylistTracks = (
  playlistId: string | null,
  options: UsePlaylistTracksOptions = {}
) => {
  const { limit = 20, mode = 'replace' } = options
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchTracks = useCallback(
    async (offset: number) => {
      if (!playlistId) return

      try {
        setLoading(true)
        setError(null)
        const res = await fetch(
          `/api/spotify/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`
        )

        let data
        try {
          data = await res.json()
        } catch {
          // If not OK and JSON fails, we'll throw below
        }

        if (!res.ok) {
          throw new Error(data?.message || 'Failed to fetch tracks')
        }

        if (mode === 'append') {
          setTracks((prev) => (offset === 0 ? data.tracks : [...prev, ...data.tracks]))
        } else {
          setTracks(data.tracks)
        }

        setTotal(data.total)
        setHasMore(data.tracks.length === limit)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [playlistId, limit, mode]
  )

  return {
    tracks,
    loading,
    error,
    total,
    hasMore,
    fetchTracks,
  }
}

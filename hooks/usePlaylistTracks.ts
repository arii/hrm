import { useState, useCallback } from 'react'
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

        let data:
          | { tracks: Track[]; total: number; message?: string }
          | undefined
        try {
          data = await res.json()
        } catch {
          // If not OK and JSON fails, we'll throw below
        }

        if (!res.ok) {
          throw new Error(data?.message || 'Failed to fetch tracks')
        }

        if (!data) {
          throw new Error('No data returned from Spotify API')
        }

        const tracksData = data.tracks
        if (mode === 'append') {
          setTracks((prev) =>
            offset === 0 ? tracksData : [...prev, ...tracksData]
          )
        } else {
          setTracks(tracksData)
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

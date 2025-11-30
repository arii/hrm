// File: hooks/useSpotifyData.ts
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { useMemo } from 'react'

/**
 * @description A hook to extract memoized Spotify data from the WebSocket context.
 * This hook ensures that consumers only re-render when the specific spotifyData values change.
 * @returns {object} An object containing the Spotify data.
 */
export const useSpotifyData = () => {
  const { spotifyData } = useWebSocket()

  const memoizedSpotifyData = useMemo(() => {
    return {
      trackName: spotifyData.trackName,
      artist: spotifyData.artist,
      isPlaying: spotifyData.isPlaying,
      albumArtUrl: spotifyData.albumArtUrl,
      durationMs: spotifyData.durationMs,
      progressMs: spotifyData.progressMs,
    }
  }, [
    spotifyData.trackName,
    spotifyData.artist,
    spotifyData.isPlaying,
    spotifyData.albumArtUrl,
    spotifyData.durationMs,
    spotifyData.progressMs,
  ])

  return memoizedSpotifyData
}

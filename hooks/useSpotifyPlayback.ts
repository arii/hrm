'use client'

import { useWebSocket } from '@/context/WebSocketContext'

/**
 * Hook to extract and manage Spotify playback state from the WebSocket bus.
 * Provides a clean interface for track info, playback status, and volume.
 */
export const useSpotifyPlayback = () => {
  const { spotifyData } = useWebSocket()
  const playback = spotifyData.playback

  return {
    track: playback.track,
    isPlaying: playback.is_playing,
    progressMs: playback.progress_ms,
    volumePercent: playback.volume_percent,
    isMuted: playback.isMuted,
    // Derived state
    hasTrack:
      playback.track.name !== 'Awaiting Login...' &&
      playback.track.name !== '' &&
      playback.track.name !== 'No Track Playing',
  }
}

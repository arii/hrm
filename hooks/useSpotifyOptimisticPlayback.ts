'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SpotifyCommand } from '@/types/websocket'

/**
 * Hook to manage optimistic UI updates for Spotify playback (play/pause).
 * Centralizes the logic to provide immediate feedback on clicks while
 * waiting for server-side polling to catch up.
 *
 * @param isPlaying - The actual playback state from the server/WebSocket.
 * @param sendSpotifyCommand - Function to dispatch the command to the server.
 * @returns {object} Optimistic state and handlers.
 */
export const useSpotifyOptimisticPlayback = (
  isPlaying: boolean,
  sendSpotifyCommand: (command: SpotifyCommand) => void
) => {
  const [optimisticIsPlaying, setOptimisticIsPlaying] = useState<
    boolean | null
  >(null)
  const graceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleCommand = useCallback(
    (command: SpotifyCommand) => {
      // We only provide optimistic feedback for PLAY and PAUSE
      if (command === 'PLAY') {
        setOptimisticIsPlaying(true)
      } else if (command === 'PAUSE') {
        setOptimisticIsPlaying(false)
      }

      // Clear existing grace timer if any
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current)
      }

      // Set a safety timeout to clear optimistic state if the server doesn't respond
      // or if the action was rejected.
      graceTimerRef.current = setTimeout(() => {
        setOptimisticIsPlaying(null)
        graceTimerRef.current = null
      }, 3000)

      sendSpotifyCommand(command)
    },
    [sendSpotifyCommand]
  )

  // Clear optimistic state when the actual state matches our intent
  useEffect(() => {
    if (optimisticIsPlaying === isPlaying) {
      setOptimisticIsPlaying(null)
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current)
        graceTimerRef.current = null
      }
    }
  }, [isPlaying, optimisticIsPlaying])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current)
      }
    }
  }, [])

  return {
    // Current display state: optimistic if set, otherwise actual
    displayIsPlaying:
      optimisticIsPlaying !== null ? optimisticIsPlaying : isPlaying,
    handleCommand,
    isOptimistic: optimisticIsPlaying !== null,
  }
}

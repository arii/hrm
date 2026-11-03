import { useCallback, useEffect, useRef, useState } from 'react'
import type { SpotifyCommand } from '@/types/websocket'

const OPTIMISTIC_PLAYBACK_GRACE_MS = 2500

/**
 * Optimistic play/pause for the control page (#9298). Flips the UI
 * immediately and reverts to server truth when the grace window elapses.
 */
export const useOptimisticPlayPause = ({
  sendCommand,
}: {
  sendCommand: (command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS') => void
}) => {
  const [optimisticIsPlaying, setOptimisticIsPlaying] = useState<
    boolean | null
  >(null)
  const playbackGraceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handlePlaybackCommand = useCallback(
    (command: SpotifyCommand) => {
      if (
        command === 'PLAY' ||
        command === 'PAUSE' ||
        command === 'NEXT' ||
        command === 'PREVIOUS'
      ) {
        // Optimistic UI update for Play/Pause
        if (command === 'PLAY') {
          setOptimisticIsPlaying(true)
        } else if (command === 'PAUSE') {
          setOptimisticIsPlaying(false)
        }

        // Clear existing timer if any
        if (playbackGraceTimerRef.current) {
          clearTimeout(playbackGraceTimerRef.current)
        }

        playbackGraceTimerRef.current = setTimeout(() => {
          setOptimisticIsPlaying(null)
          playbackGraceTimerRef.current = null
        }, OPTIMISTIC_PLAYBACK_GRACE_MS)

        sendCommand(command)
      }
    },
    [sendCommand]
  )

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (playbackGraceTimerRef.current) {
        clearTimeout(playbackGraceTimerRef.current)
      }
    }
  }, [])

  return { optimisticIsPlaying, handlePlaybackCommand }
}

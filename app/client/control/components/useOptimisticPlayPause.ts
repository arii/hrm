import { useCallback, useRef } from 'react'
import type { SpotifyCommand } from '@/types/websocket'
import {
  setOptimisticPlaying,
  useSyncedPlaying,
} from '@/lib/spotify/optimisticPlayback'

// Repeats of the same playback command within this window are dropped.
const PLAYBACK_COMMAND_COOLDOWN_MS = 800

/**
 * Optimistic play/pause for the control page (#9298, #9313). Flips the UI
 * immediately via the shared cross-surface store (dashboard + control page
 * agree instantly) and drops same-command double-taps within the cooldown
 * window — but a change of mind (PLAY followed by PAUSE) always goes
 * through. The store reverts automatically (grace window / server catch-up).
 */
export const useOptimisticPlayPause = ({
  sendCommand,
  serverIsPlaying,
}: {
  sendCommand: (command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS') => void
  serverIsPlaying: boolean
}) => {
  // Shared with the dashboard so both surfaces flip instantly and in sync.
  const displayPlaying = useSyncedPlaying(serverIsPlaying)
  // Guards against accidental double-taps skipping two tracks.
  const lastPlaybackCommandRef = useRef<{
    command: SpotifyCommand
    at: number
  } | null>(null)

  const handlePlaybackCommand = useCallback(
    (command: SpotifyCommand) => {
      if (
        command === 'PLAY' ||
        command === 'PAUSE' ||
        command === 'NEXT' ||
        command === 'PREVIOUS'
      ) {
        const now = Date.now()
        const last = lastPlaybackCommandRef.current
        if (
          last?.command === command &&
          now - last.at < PLAYBACK_COMMAND_COOLDOWN_MS
        ) {
          return
        }
        lastPlaybackCommandRef.current = { command, at: now }

        // Optimistic UI update for Play/Pause (shared with all surfaces)
        if (command === 'PLAY') {
          setOptimisticPlaying(true)
        } else if (command === 'PAUSE') {
          setOptimisticPlaying(false)
        }

        sendCommand(command)
      }
    },
    [sendCommand]
  )

  return { displayPlaying, handlePlaybackCommand }
}

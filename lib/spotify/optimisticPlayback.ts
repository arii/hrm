import { useEffect, useSyncExternalStore } from 'react'

// Grace window for optimistic play/pause. Spotify's playback state lags a
// command by a few seconds, so a shorter window let a stale "still
// playing" poll flip Pause back to Playing. 12s spans the post-command
// re-polls plus two regular 5s polls; agreement from the server still
// clears it at once.
export const OPTIMISTIC_REVERT_MS = 12000

let optimistic: boolean | null = null
let revertTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

const emit = () => {
  for (const listener of listeners) listener()
}

const clearTimer = () => {
  if (revertTimer) {
    clearTimeout(revertTimer)
    revertTimer = null
  }
}

/**
 * Shares one optimistic play/pause value across every surface (dashboard,
 * control page, device tiles) so they never disagree: tapping pause on one
 * surface instantly reflects on all of them, instead of waiting up to a
 * full server poll. Reverts automatically after the grace window or as
 * soon as the server state agrees (see useSyncedPlaying).
 */
export const setOptimisticPlaying = (value: boolean | null): void => {
  clearTimer()
  optimistic = value
  if (value !== null) {
    revertTimer = setTimeout(() => {
      optimistic = null
      revertTimer = null
      emit()
    }, OPTIMISTIC_REVERT_MS)
  }
  emit()
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = (): boolean | null => optimistic
const getServerSnapshot = (): boolean | null => null

/**
 * Effective play state: the shared optimistic value while fresh, else the
 * server value. Clears the optimistic value once the server catches up.
 */
export const useSyncedPlaying = (serverPlaying: boolean): boolean => {
  const optimisticValue = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  useEffect(() => {
    if (optimisticValue !== null && optimisticValue === serverPlaying) {
      setOptimisticPlaying(null)
    }
  }, [serverPlaying, optimisticValue])

  return optimisticValue ?? serverPlaying
}

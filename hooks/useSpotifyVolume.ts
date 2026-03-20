'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { VOLUME_SYNC_GRACE_PERIOD_MS } from '@/constants/spotify'

/**
 * Hook to manage Spotify volume with optimistic UI and grace periods.
 * Centralizes volume control logic for both the Dashboard and Control Panel.
 *
 * @param currentVolume - The actual volume from the server (0-100).
 * @param isMuted - The actual muted state from the server.
 * @param selectedDeviceId - The currently selected device ID.
 * @param activeDeviceId - The currently active device ID from the server.
 * @param executeCommand - Function to dispatch 'SET_VOLUME' to the server.
 */
export const useSpotifyVolume = (
  currentVolume: number,
  isMuted: boolean,
  selectedDeviceId: string | null,
  activeDeviceId: string | undefined,
  executeCommand: (
    command: 'SET_VOLUME',
    payload: { volume: number; deviceId: string }
  ) => void
) => {
  const [localVolume, setLocalVolume] = useState(currentVolume)
  const [localMuted, setLocalMuted] = useState(isMuted)
  const lastSyncTimeRef = useRef<number>(0)
  const lastVolumeRef = useRef<number>(currentVolume)

  // Sync local state with server state, respecting the grace period
  useEffect(() => {
    const now = Date.now()
    if (now - lastSyncTimeRef.current > VOLUME_SYNC_GRACE_PERIOD_MS) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalVolume(currentVolume)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalMuted(isMuted)
      if (!isMuted && currentVolume > 0) {
        lastVolumeRef.current = currentVolume
      }
    }
  }, [currentVolume, isMuted])

  const targetDeviceId = selectedDeviceId || activeDeviceId

  const sendVolume = useCallback(
    (volume: number) => {
      if (!targetDeviceId) return

      lastSyncTimeRef.current = Date.now()
      executeCommand('SET_VOLUME', {
        volume,
        deviceId: targetDeviceId,
      })
    },
    [targetDeviceId, executeCommand]
  )

  const handleVolumeChange = useCallback((newVolume: number) => {
    setLocalVolume(newVolume)
    setLocalMuted(newVolume === 0)
    if (newVolume > 0) {
      lastVolumeRef.current = newVolume
    }
    // We don't send on every slider move, usually wait for committed or use a throttle
  }, [])

  const handleVolumeCommit = useCallback(
    (newVolume: number) => {
      sendVolume(newVolume)
    },
    [sendVolume]
  )

  const handleToggleMute = useCallback(() => {
    const nextMuted = !localMuted
    const nextVolume = nextMuted ? 0 : lastVolumeRef.current || 50

    setLocalMuted(nextMuted)
    setLocalVolume(nextVolume)
    sendVolume(nextVolume)
  }, [localMuted, sendVolume])

  return {
    volume: localVolume,
    muted: localMuted,
    handleVolumeChange,
    handleVolumeCommit,
    handleToggleMute,
    hasActiveDevice: !!targetDeviceId,
  }
}

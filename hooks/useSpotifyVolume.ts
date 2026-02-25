// File: hooks/useSpotifyVolume.ts
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import throttle from 'lodash.throttle'
import { clampVolume } from './useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { SYNC_LOCK_DURATION } from '@/constants/spotify'

interface UseSpotifyVolumeProps {
  serverVolume: number | undefined
  targetDeviceId: string | undefined
  onLocalVolumeChange?: (volume: number) => void
  syncDependencies?: unknown[]
}

/**
 * Custom hook to manage optimistic volume control for Spotify.
 * Handles interaction locks, throttling, and server synchronization.
 */
export const useSpotifyVolume = ({
  serverVolume,
  targetDeviceId,
  onLocalVolumeChange,
  syncDependencies = [],
}: UseSpotifyVolumeProps) => {
  const { connectionStatus } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()

  const [displayVolume, setDisplayVolume] = useState<number>(serverVolume ?? 70)
  const [isSliding, setIsSliding] = useState(false)
  const lastUserInteractionRef = useRef<number>(0)
  const lastSentVolumeRef = useRef<string | null>(null)

  // Autoritative sync from server
  useEffect(() => {
    const isLocked = Date.now() - lastUserInteractionRef.current < SYNC_LOCK_DURATION

    if (isSliding || isLocked) {
      return
    }

    if (typeof serverVolume === 'number' && serverVolume !== displayVolume) {
      setDisplayVolume(serverVolume)
      onLocalVolumeChange?.(serverVolume)
    }
  }, [
    serverVolume,
    isSliding,
    displayVolume,
    onLocalVolumeChange,
    ...syncDependencies,
  ])

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected' || !targetDeviceId) return

      const sanitized = clampVolume(value)
      const messageKey = `${targetDeviceId}:${sanitized}`

      // Avoid redundant commands
      if (lastSentVolumeRef.current === messageKey) return

      lastUserInteractionRef.current = Date.now()

      executeSpotify('SET_VOLUME', {
        volume: sanitized,
        deviceId: targetDeviceId,
      })

      lastSentVolumeRef.current = messageKey
    },
    [connectionStatus, targetDeviceId, executeSpotify]
  )

  // Throttled volume command for live updates (200ms)
  const throttledSendVolumeCommand = useMemo(
    () =>
      throttle((val: number) => {
        sendVolumeCommand(val)
      }, 200),
    [sendVolumeCommand]
  )

  useEffect(() => {
    return () => {
      throttledSendVolumeCommand.cancel()
    }
  }, [throttledSendVolumeCommand])

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setIsSliding(true)
      lastUserInteractionRef.current = Date.now()
      setDisplayVolume(newVolume)
      onLocalVolumeChange?.(newVolume)
      throttledSendVolumeCommand(newVolume)
    },
    [throttledSendVolumeCommand, onLocalVolumeChange]
  )

  const handleVolumeChangeCommitted = useCallback(
    (newVolume: number) => {
      setIsSliding(false)
      lastUserInteractionRef.current = Date.now()
      sendVolumeCommand(newVolume) // Final authoritative update
    },
    [sendVolumeCommand]
  )

  // Reset lastSentVolumeRef on disconnect to allow resending same volume on reconnect
  useEffect(() => {
    if (connectionStatus !== 'Connected') {
      lastSentVolumeRef.current = null
    }
  }, [connectionStatus])

  return {
    volume: displayVolume,
    setVolume: setDisplayVolume,
    isSliding,
    handleVolumeChange,
    handleVolumeChangeCommitted,
    lastUserInteractionRef,
  }
}

export default useSpotifyVolume

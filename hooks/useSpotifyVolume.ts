// File: hooks/useSpotifyVolume.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import throttle from 'lodash.throttle'
import { clampVolume } from './useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { SYNC_LOCK_DURATION } from '@/constants/spotify'

interface UseSpotifyVolumeProps {
  serverVolume: number | undefined
  targetDeviceId: string | undefined
  onLocalVolumeChange?: (volume: number) => void
}

/**
 * Custom hook to manage optimistic volume control for Spotify.
 * Handles interaction locks, throttling, and server synchronization.
 */
export const useSpotifyVolume = ({
  serverVolume,
  targetDeviceId,
  onLocalVolumeChange,
}: UseSpotifyVolumeProps) => {
  const { connectionStatus } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()

  const [displayVolume, setDisplayVolume] = useState<number>(serverVolume ?? 70)
  const [isSliding, setIsSliding] = useState(false)
  const [lockExpiredTick, setLockExpiredTick] = useState(0)
  const lastUserInteractionRef = useRef<number>(0)
  const lastSentVolumeRef = useRef<string | null>(null)

  // Autoritative sync from server
  useEffect(() => {
    const isLocked =
      Date.now() - lastUserInteractionRef.current < SYNC_LOCK_DURATION

    if (isSliding || isLocked) {
      return
    }

    if (typeof serverVolume === 'number' && serverVolume !== displayVolume) {
      // Synchronous sync is required for some tests and immediate UI feedback.
      // We accept the cascading render as it only happens when authoritative server state diverges.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayVolume(serverVolume)
      onLocalVolumeChange?.(serverVolume)
    }
  }, [
    serverVolume,
    isSliding,
    displayVolume,
    onLocalVolumeChange,
    lockExpiredTick,
  ])

  // Timer to trigger re-sync when lock expires
  useEffect(() => {
    const timeSinceInteraction = Date.now() - lastUserInteractionRef.current
    if (timeSinceInteraction < SYNC_LOCK_DURATION) {
      const timeout = setTimeout(
        () => {
          setLockExpiredTick((t) => t + 1)
        },
        SYNC_LOCK_DURATION - timeSinceInteraction + 50
      ) // Small buffer
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [displayVolume, isSliding])

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

  // Stable reference for throttled function to avoid re-creation and lint issues
  const sendVolumeCommandRef = useRef(sendVolumeCommand)
  useEffect(() => {
    sendVolumeCommandRef.current = sendVolumeCommand
  }, [sendVolumeCommand])

  // Use a ref for the throttled function and initialize in useEffect to avoid render access issues
  const throttledRef = useRef<ReturnType<typeof throttle>>(null)
  useEffect(() => {
    throttledRef.current = throttle((val: number) => {
      sendVolumeCommandRef.current(val)
    }, 200)
    return () => {
      throttledRef.current?.cancel()
    }
  }, [])

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setIsSliding(true)
      lastUserInteractionRef.current = Date.now()
      setDisplayVolume(newVolume)
      onLocalVolumeChange?.(newVolume)
      throttledRef.current?.(newVolume)
    },
    [onLocalVolumeChange]
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

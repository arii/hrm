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

  useEffect(() => {
    const timeSinceInteraction = Date.now() - lastUserInteractionRef.current
    const isLocked = timeSinceInteraction < SYNC_LOCK_DURATION

    if (isSliding || isLocked) {
      if (isLocked && !isSliding) {
        const timeout = setTimeout(
          () => setLockExpiredTick((t) => t + 1),
          SYNC_LOCK_DURATION - timeSinceInteraction + 50
        )
        return () => clearTimeout(timeout)
      }
      return
    }

    if (typeof serverVolume === 'number' && serverVolume !== displayVolume) {
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

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected' || !targetDeviceId) return
      const sanitized = clampVolume(value)
      const messageKey = `${targetDeviceId}:${sanitized}`
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

  const sendRef = useRef(sendVolumeCommand)
  useEffect(() => {
    sendRef.current = sendVolumeCommand
  }, [sendVolumeCommand])

  const throttledRef = useRef<ReturnType<typeof throttle>>(null)
  useEffect(() => {
    throttledRef.current = throttle((val: number) => sendRef.current(val), 200)
    return () => throttledRef.current?.cancel()
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
      sendVolumeCommand(newVolume)
    },
    [sendVolumeCommand]
  )

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

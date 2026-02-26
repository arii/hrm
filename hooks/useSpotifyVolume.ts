'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import throttle from 'lodash.throttle'
import { clampVolume } from './useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { SYNC_LOCK_DURATION } from '@/constants/spotify'
import { useInteractionLock } from './useInteractionLock'

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
  const { isLocked, lock } = useInteractionLock(SYNC_LOCK_DURATION)
  const lastSentVolumeRef = useRef<string | null>(null)

  useEffect(() => {
    if (isSliding || isLocked) {
      return
    }

    if (typeof serverVolume === 'number' && serverVolume !== displayVolume) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayVolume(serverVolume)
      onLocalVolumeChange?.(serverVolume)
    }
  }, [serverVolume, isSliding, isLocked, displayVolume, onLocalVolumeChange])

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected' || !targetDeviceId) return
      const sanitized = clampVolume(value)
      const messageKey = `${targetDeviceId}:${sanitized}`
      if (lastSentVolumeRef.current === messageKey) return

      lock()
      executeSpotify('SET_VOLUME', {
        volume: sanitized,
        deviceId: targetDeviceId,
      })
      lastSentVolumeRef.current = messageKey
    },
    [connectionStatus, targetDeviceId, executeSpotify, lock]
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
      lock()
      setDisplayVolume(newVolume)
      onLocalVolumeChange?.(newVolume)
      throttledRef.current?.(newVolume)
    },
    [onLocalVolumeChange, lock]
  )

  const handleVolumeChangeCommitted = useCallback(
    (newVolume: number) => {
      setIsSliding(false)
      lock()
      sendVolumeCommand(newVolume)
    },
    [sendVolumeCommand, lock]
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
  }
}

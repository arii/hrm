'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import {
  VOLUME_SYNC_GRACE_PERIOD_MS,
  HRM_WEB_PLAYER_NAME,
  EMPTY_DEVICES,
} from '@/constants/spotify'

export const useSpotifyDeviceSync = (
  isSliding: boolean,
  volume: number,
  setVolume: (v: number) => void
) => {
  const { spotifyData } = useWebSocket()
  const devices = spotifyData?.devices || EMPTY_DEVICES
  const playback = spotifyData?.playback

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const prevActiveIdRef = useRef<string | undefined>(undefined)
  const lastVolumeSyncTimeRef = useRef<number>(0)
  const hasPendingSendRef = useRef<boolean>(false)

  const hrmDevice = devices.find(
    (d) => d.name?.toLowerCase() === HRM_WEB_PLAYER_NAME.toLowerCase()
  )

  useEffect(() => {
    const activeDevice = devices.find((d) => d.is_active)
    const activeId = activeDevice?.id

    const shouldUpdateToActive = () => {
      if (!prevActiveIdRef.current || activeId !== prevActiveIdRef.current) {
        return Boolean(activeId)
      }
      const selectedStillExists = devices.some(
        (d) => d.id === selectedDeviceId
      )
      return (!selectedDeviceId || !selectedStillExists) && Boolean(activeId)
    }

    if (shouldUpdateToActive()) {
      setSelectedDeviceId(activeId!)
    }
    prevActiveIdRef.current = activeId

    if (isSliding) return

    const playbackVolume = playback?.volume_percent
    const timeSinceLastVolumeSend = Date.now() - lastVolumeSyncTimeRef.current
    const shouldRespectGracePeriod =
      hasPendingSendRef.current &&
      timeSinceLastVolumeSend < VOLUME_SYNC_GRACE_PERIOD_MS

    if (shouldRespectGracePeriod) return

    if (
      hasPendingSendRef.current &&
      timeSinceLastVolumeSend >= VOLUME_SYNC_GRACE_PERIOD_MS
    ) {
      hasPendingSendRef.current = false
    }

    if (activeDevice && typeof playbackVolume === 'number') {
      if (playbackVolume !== volume) {
        setVolume(playbackVolume)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, selectedDeviceId, playback?.volume_percent, isSliding])

  useEffect(() => {
    if (
      devices.length > 0 &&
      !selectedDeviceId &&
      !devices.some((d) => d.is_active) &&
      hrmDevice
    ) {
      setSelectedDeviceId(hrmDevice.id)
    }
  }, [devices, selectedDeviceId, hrmDevice])

  const resolveTargetDeviceId = useCallback(() => {
    return (
      selectedDeviceId ||
      devices.find((device) => device.is_active)?.id ||
      hrmDevice?.id
    )
  }, [devices, selectedDeviceId, hrmDevice])

  const markVolumeCommandSent = useCallback(() => {
    hasPendingSendRef.current = true
    lastVolumeSyncTimeRef.current = Date.now()
  }, [])

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    resolveTargetDeviceId,
    markVolumeCommandSent,
    hrmDevice,
    playback,
  }
}

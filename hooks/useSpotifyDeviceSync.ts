import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { SpotifyDevice } from '@/types/core'
import { HRM_WEB_PLAYER_NAME } from '@/constants/spotify'

interface UseSpotifyDeviceSyncProps {
  devices: SpotifyDevice[]
  onTransferPlayback?: (deviceId: string) => void
}

/**
 * Hook to synchronize selected Spotify device with the authoritative server state.
 * Prevents "dispatch during render" and centralizes device resolution logic.
 */
export const useSpotifyDeviceSync = ({
  devices,
  onTransferPlayback,
}: UseSpotifyDeviceSyncProps) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const prevActiveIdRef = useRef<string | undefined>(undefined)

  const hrmDevice = useMemo(
    () =>
      devices.find(
        (d) => d.name?.toLowerCase() === HRM_WEB_PLAYER_NAME.toLowerCase()
      ),
    [devices]
  )

  const activeDevice = useMemo(
    () => devices.find((d) => d.is_active),
    [devices]
  )
  const activeId = activeDevice?.id

  useEffect(() => {
    // 1. Sync when authoritative active device changes
    if (activeId !== prevActiveIdRef.current) {
      prevActiveIdRef.current = activeId
      if (activeId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedDeviceId(activeId)
      }
    } else if (
      !selectedDeviceId &&
      devices.length > 0 &&
      !activeId &&
      hrmDevice
    ) {
      // 2. Auto-select HRM Web Player if no active device is available
      setSelectedDeviceId(hrmDevice.id)
    } else if (
      selectedDeviceId &&
      !devices.some((d) => d.id === selectedDeviceId)
    ) {
      // 3. Fallback if selected device is lost
      setSelectedDeviceId(activeId ?? '')
    }
  }, [activeId, devices, hrmDevice, selectedDeviceId])

  const handleDeviceSelect = useCallback(
    (deviceId: string) => {
      setSelectedDeviceId(deviceId)
      if (deviceId) {
        onTransferPlayback?.(deviceId)
      }
    },
    [onTransferPlayback]
  )

  const resolveTargetDeviceId = useCallback(() => {
    return selectedDeviceId || activeId || hrmDevice?.id
  }, [selectedDeviceId, activeId, hrmDevice])

  const hasActiveDevice = useMemo(() => {
    return devices.some((d) => d.is_active || d.id === selectedDeviceId)
  }, [devices, selectedDeviceId])

  return {
    selectedDeviceId,
    setSelectedDeviceId,
    hrmDevice,
    activeDevice,
    handleDeviceSelect,
    resolveTargetDeviceId,
    hasActiveDevice,
  }
}

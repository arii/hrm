import { useEffect, useRef, useState } from 'react'
import { SpotifyDevice } from '@/types/core'

/**
 * Hook to manage Spotify device selection and synchronization.
 * Encapsulates the logic for auto-selecting active devices or falling back to HRM player.
 */
export const useSpotifyDeviceSync = (
  devices: SpotifyDevice[],
  hrmDevice?: SpotifyDevice
) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const prevActiveIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const activeDevice = devices.find((d) => d.is_active)
    const activeId = activeDevice?.id

    const shouldUpdateToActive = () => {
      // Sync if the active device changed externally or initial load
      if (!prevActiveIdRef.current || activeId !== prevActiveIdRef.current) {
        return Boolean(activeId)
      }

      // Sync if the previously selected device is gone
      const selectedStillExists = devices.some((d) => d.id === selectedDeviceId)
      return (!selectedDeviceId || !selectedStillExists) && Boolean(activeId)
    }

    if (shouldUpdateToActive()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDeviceId(activeId!)
    }
    prevActiveIdRef.current = activeId
  }, [devices, selectedDeviceId])

  useEffect(() => {
    if (
      devices.length > 0 &&
      !selectedDeviceId &&
      !devices.some((d) => d.is_active) &&
      hrmDevice
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDeviceId(hrmDevice.id)
    }
  }, [devices, selectedDeviceId, hrmDevice])

  return {
    selectedDeviceId,
    setSelectedDeviceId,
  }
}

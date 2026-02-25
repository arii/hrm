import { useEffect, useRef, useState } from 'react'
import { SpotifyDevice } from '@/types/core'

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
      // Auto-sync if active device changed or no selection made/selection gone
      if (!prevActiveIdRef.current || activeId !== prevActiveIdRef.current) {
        return Boolean(activeId)
      }

      const selectedStillExists = devices.some((d) => d.id === selectedDeviceId)
      return (!selectedDeviceId || !selectedStillExists) && Boolean(activeId)
    }

    if (shouldUpdateToActive()) {
      setSelectedDeviceId(activeId!)
    }
    prevActiveIdRef.current = activeId
  }, [devices, selectedDeviceId])

  // Fallback to HRM Web Player if no active device is available
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

  return {
    selectedDeviceId,
    setSelectedDeviceId,
  }
}

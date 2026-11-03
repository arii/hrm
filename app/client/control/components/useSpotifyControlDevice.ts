import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HRM_WEB_PLAYER_NAME } from '@/constants/spotify'
import { resolveTargetDeviceId as resolveDeviceId } from '@/lib/spotify/deviceResolution'
import type { SpotifyDevice } from '@/types/core'

/** Device lifecycle for the control page: fetch, select, target (#9298). */
export const useSpotifyControlDevice = ({
  devices,
  connectionStatus,
  spotifyServiceInitialized,
  sendData,
}: {
  devices: SpotifyDevice[]
  connectionStatus: string
  spotifyServiceInitialized: boolean | undefined
  sendData: (data: { type: 'SPOTIFY_COMMAND'; command: 'GET_DEVICES' }) => void
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const prevActiveIdRef = useRef<string | undefined>(undefined)

  // Request devices on mount or connection
  useEffect(() => {
    if (connectionStatus === 'Connected' && spotifyServiceInitialized) {
      sendData({ type: 'SPOTIFY_COMMAND', command: 'GET_DEVICES' })
    }
  }, [connectionStatus, sendData, spotifyServiceInitialized])

  const hrmDevice = useMemo(
    () =>
      devices.find(
        (d) => d.name?.toLowerCase() === HRM_WEB_PLAYER_NAME.toLowerCase()
      ),
    [devices]
  )

  // Sync selected device with active device
  useEffect(() => {
    const activeDevice = devices.find((d) => d.is_active)
    const activeId = activeDevice?.id

    // Helper: determine if device should be updated to activeId
    const shouldUpdateToActive = () => {
      // Initial sync or active device changed externally
      if (!prevActiveIdRef.current || activeId !== prevActiveIdRef.current) {
        return Boolean(activeId)
      }
      // Selected device no longer exists or no device selected
      const selectedStillExists = devices.some((d) => d.id === selectedDeviceId)
      return (!selectedDeviceId || !selectedStillExists) && Boolean(activeId)
    }

    if (shouldUpdateToActive()) {
      setSelectedDeviceId(activeId!)
    }
    prevActiveIdRef.current = activeId

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]) // Rely on devices update to trigger sync

  // Auto-select HRM Web Player if no active device is available
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
    return resolveDeviceId(selectedDeviceId, devices, hrmDevice?.id)
  }, [devices, selectedDeviceId, hrmDevice])

  return {
    selectedDeviceId,
    selectDevice: setSelectedDeviceId,
    resolveTargetDeviceId,
  }
}

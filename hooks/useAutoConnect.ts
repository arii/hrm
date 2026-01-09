import { useEffect, useCallback } from 'react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { UserSettings } from '@/types'

export const useAutoConnect = (
  userSettings: UserSettings,
  setUserSettings: (settings: Partial<UserSettings>) => void
) => {
  const { isConnected: isSocketConnected } = useWebSocket()
  const { connectWithDevice, deviceStatus } = useBluetoothHRM()

  const autoConnect = useCallback(async () => {
    if (
      userSettings.deviceId &&
      deviceStatus === 'Disconnected' &&
      isSocketConnected
    ) {
      try {
        await connectWithDevice(userSettings.deviceId)
      } catch (_error) {
        // Clear the device ID if auto-connect fails
        setUserSettings({ deviceId: undefined })
      }
    }
  }, [
    userSettings.deviceId,
    status,
    isSocketConnected,
    connectWithDevice,
    setUserSettings,
  ])

  useEffect(() => {
    autoConnect()
  }, [autoConnect])
}

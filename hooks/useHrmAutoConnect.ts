// File: hooks/useHrmAutoConnect.ts
import { useEffect, useRef } from 'react'
import { Session } from 'next-auth'
import { UserSettings } from '@/types/index'

interface UseHrmAutoConnectProps {
  connectionStatus: string
  deviceStatus: string
  session: Session | null
  userSettings: UserSettings
  connectAndStream: (userName: string, userAge: number) => Promise<void>
}

/**
 * @hook useHrmAutoConnect
 * @description Manages the auto-connection logic for the HRM device.
 * @param {UseHrmAutoConnectProps} props - The properties for the hook.
 */
const useHrmAutoConnect = ({
  connectionStatus,
  deviceStatus,
  session,
  userSettings,
  connectAndStream,
}: UseHrmAutoConnectProps) => {
  const autoConnectAttempted = useRef(false)

  useEffect(() => {
    // Auto-connect logic: Use `getDevices()` for gesture-less reconnection.
    const autoConnect = async () => {
      if (
        connectionStatus === 'Connected' &&
        deviceStatus === 'Disconnected' &&
        !autoConnectAttempted.current
      ) {
        autoConnectAttempted.current = true
        const userName =
          session?.user?.name || userSettings.userName || 'Unknown User'
        const userAge = userSettings.userAge || 30
        await connectAndStream(userName, userAge)
      }
    }

    autoConnect()
  }, [connectionStatus, deviceStatus, connectAndStream, session, userSettings])
}

export default useHrmAutoConnect

// hooks/useAutoConnect.ts
import { useEffect, useRef } from 'react'
import { getCookie } from '@/utils/cookie'
import { useUserSettings } from '@/context/UserSettingsContext'

interface UseAutoConnectProps {
  connectAndStream: () => void
  isConnected: boolean
}

/**
 * @hook useAutoConnect
 * @description A hook that automatically triggers a Bluetooth connection attempt
 * on component mount if the user has previously connected a device and the
 * `autoConnect` setting is enabled.
 * @param {UseAutoConnectProps} props - The props for the hook.
 * @sideeffect Triggers the `connectAndStream` function.
 */
const useAutoConnect = ({
  connectAndStream,
  isConnected,
}: UseAutoConnectProps) => {
  const [userSettings] = useUserSettings()
  const hasAttemptedAutoConnect = useRef(false)

  useEffect(() => {
    const hasSavedDevice = !!getCookie('hrm_device_id')
    if (
      !hasAttemptedAutoConnect.current &&
      userSettings.autoConnect &&
      hasSavedDevice &&
      !isConnected
    ) {
      connectAndStream()
      hasAttemptedAutoConnect.current = true
    }
  }, [userSettings.autoConnect, isConnected, connectAndStream])
}

export default useAutoConnect

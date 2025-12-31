// hooks/useHrmPanel.ts
import { useMemo, useEffect, useRef } from 'react'
import { HrmData, ActiveAlert } from '@/types/websocket'
import { useSession } from 'next-auth/react'
import { UserPreferences } from './useUserPreferences'

interface UseHrmPanelProps {
  hrmData: HrmData[]
  activeAlerts: ActiveAlert[]
  connectionStatus: string
  deviceStatus: string
  connectAndStream: (userName: string, userAge: number) => Promise<void>
  userSettings: UserPreferences
}

export const useHrmPanel = ({
  hrmData,
  activeAlerts,
  connectionStatus,
  deviceStatus,
  connectAndStream,
  userSettings,
}: UseHrmPanelProps) => {
  const { data: session } = useSession()
  const autoConnectAttempted = useRef(false)

  useEffect(() => {
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

  const tileData = useMemo(() => {
    return hrmData
      .filter((user) => {
        const isPlaceholderName = !!user.name && /new user/i.test(user.name)
        const hasNoIdentity = user.name == null
        return !(isPlaceholderName || hasNoIdentity)
      })
      .map((user) => {
        const matchingAlert = activeAlerts.find(
          (alert) =>
            alert.clientId === user.clientId &&
            (alert.code === 'BAD_PLACEMENT' || alert.code === 'HRM_STALE')
        )

        return {
          ...user,
          isAlerting: !!matchingAlert,
          alertMessage: matchingAlert?.message,
        }
      })
  }, [hrmData, activeAlerts])

  const isLoading =
    connectionStatus === 'Connecting...' ||
    connectionStatus === 'Reconnecting...'

  return { tileData, isLoading }
}

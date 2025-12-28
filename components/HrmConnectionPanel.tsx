// File: app/components/dashboard/HrmConnectionPanel.tsx
'use client'
import { useMemo, useEffect, useCallback, useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useSession } from 'next-auth/react'
import { useUserSettings } from '@/context/UserSettingsContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { CONNECT_HR_MONITOR_TITLE } from '@/utils/constants'
import ConnectHRMonitorButton from './ConnectHRMonitorButton'
import HRMonitorStatusIndicator from './HRMonitorStatusIndicator'
import HrTileWithCalories from './HrTileWithCalories'
import { HrmData, ActiveAlert } from '@/types/websocket'

const getDisplayTileData = (
  hrmData: HrmData[],
  activeAlerts: ActiveAlert[]
) => {
  const user = hrmData.find((user) => {
    const isPlaceholderName = !!user.name && /new user/i.test(user.name)
    const hasNoIdentity = user.name == null
    return !(isPlaceholderName || hasNoIdentity) && user.isConnected
  })

  if (!user) return null

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
}

const HrmConnectionPanel = () => {
  const { data: session } = useSession()
  const [userSettings] = useUserSettings()
  const { hrmData, connectionStatus, activeAlerts } = useWebSocket()
  const autoConnectAttempted = useRef(false)
  const {
    connectAndStream,
    disconnect,
    deviceStatus,
    batteryLevel,
    isConnected,
    isSupported,
    attemptReconnection,
  } = useBluetoothHRM()

  const handleConnect = useCallback(() => {
    const userName =
      session?.user?.name || userSettings.userName || 'Unknown User'
    const userAge = userSettings.userAge || 30
    connectAndStream(userName, userAge).catch((error) => {
      if (error.name !== 'NotFoundError') {
        console.error('Failed to connect to HRM device:', error)
      }
    })
  }, [session, userSettings, connectAndStream])

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
        await attemptReconnection(userName, userAge)
      }
    }

    autoConnect()
  }, [
    connectionStatus,
    deviceStatus,
    attemptReconnection,
    session,
    userSettings,
  ])

  const tileData = useMemo(
    () => getDisplayTileData(hrmData, activeAlerts),
    [hrmData, activeAlerts]
  )

  return (
    <Box
      data-testid="hrm-connection-panel"
      sx={{
        flexGrow: 1,
        width: { xs: '100%', lg: 'calc(50% - 16px)' },
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          height: '100%',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6">{CONNECT_HR_MONITOR_TITLE}</Typography>
        </Box>
        <HRMonitorStatusIndicator
          deviceStatus={deviceStatus}
          batteryLevel={batteryLevel}
        />
        <ConnectHRMonitorButton
          connect={handleConnect}
          disconnect={disconnect}
          isConnected={isConnected}
          isSupported={isSupported}
        />
      </Box>
      <Box
        data-testid="hr-tile-grid-item"
        sx={{
          width: {
            xs: '100%',
            sm: 'calc(50% - 8px)',
          },
        }}
      >
        <HrTileWithCalories
          user={
            tileData || {
              name:
                session?.user?.name ||
                userSettings.userName ||
                'Unknown User',
              value: 0,
              calories: 0,
              maxHr: 220 - (userSettings.userAge || 30),
              clientId: 'placeholder-tile',
            }
          }
          isAlerting={false}
          data-testid={tileData ? 'hr-tile' : 'placeholder-hr-tile'}
        />
      </Box>
    </Box>
  )
}
export default HrmConnectionPanel

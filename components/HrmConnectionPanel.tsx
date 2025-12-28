// File: app/components/dashboard/HrmConnectionPanel.tsx
'use client'
import { useMemo, useEffect, useCallback, useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useSession } from 'next-auth/react'
import { useUserSettings } from '@/context/UserSettingsContext'
import Link from 'next/link'
import IconButton from '@mui/material/IconButton'
import SettingsIcon from '@mui/icons-material/Settings'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { CONNECT_HR_MONITOR_TITLE } from '@/utils/constants'
import ConnectHRMonitorButton from './ConnectHRMonitorButton'
import HRMonitorStatusIndicator from './HRMonitorStatusIndicator'
import HrTileWithCalories from './HrTileWithCalories'

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
      // It's common for the requestDevice promise to be cancelled by the user.
      // We catch it here to prevent an unhandled rejection error in the console.
      if (error.name !== 'NotFoundError') {
        console.error('Failed to connect to HRM device:', error)
      }
    })
  }, [session, userSettings, connectAndStream])

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

  const tileData = useMemo(() => {
    // Filter out users with placeholder names or no identity
    return hrmData
      .filter((user) => {
        const isPlaceholderName = !!user.name && /new user/i.test(user.name)
        const hasNoIdentity = user.name == null
        return !(isPlaceholderName || hasNoIdentity) && user.isConnected
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
          <Link href="/client/connect" passHref>
            <IconButton aria-label="settings">
              <SettingsIcon />
            </IconButton>
          </Link>
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
            sm: 'calc(50% - 8px)', // Adjusted for 16px gap (gap: 2)
          },
        }}
      >
        <HrTileWithCalories
          user={tileData[0] || {
            name: session?.user?.name || userSettings.userName || 'Unknown User',
            value: null,
            calories: 0,
            percentMax: 0,
            clientId: 'placeholder-tile',
          }}
          isAlerting={false}
        />
      </Box>
    </Box>
  )
}
export default HrmConnectionPanel

// File: app/components/dashboard/HrmConnectionPanel.tsx
'use client'
import { useMemo, useEffect, useCallback, useRef } from 'react'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
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
  } = useBluetoothHRM({
    userName: userSettings.userName,
    userAge: userSettings.userAge || 30,
  })

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
        await connectAndStream(userName, userAge)
      }
    }

    autoConnect()
  }, [connectionStatus, deviceStatus, connectAndStream, session, userSettings])

  const tileData = useMemo(() => {
    // Filter out users with placeholder names or no identity
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

  return (
    <Paper
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        height: '100%',
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'box-shadow 0.3s',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      {isLoading || tileData.length === 0 ? (
        <>
          <Paper
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: { xs: '100%', sm: 'calc(50% - 8px)' },
              height: '100%',
              gap: 2,
              p: 2,
            }}
          >
            <Typography variant="h6">{CONNECT_HR_MONITOR_TITLE}</Typography>
            <Link href="/settings" passHref>
              <IconButton aria-label="settings">
                <SettingsIcon />
              </IconButton>
            </Link>
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
          </Paper>
          <Skeleton
            variant="rectangular"
            height={220}
            sx={{
              display: { xs: 'none', md: 'block' },
              width: { sm: 'calc(50% - 12px)' },
              borderRadius: 1,
            }}
          />
        </>
      ) : (
        tileData.map((user) => (
          <HrTileWithCalories
            key={user.clientId}
            user={user}
            isAlerting={user.isAlerting}
            {...(user.alertMessage && { alertMessage: user.alertMessage })}
          />
        ))
      )}
    </Paper>
  )
}
export default HrmConnectionPanel

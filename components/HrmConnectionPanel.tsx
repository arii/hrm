// File: app/components/dashboard/HrmConnectionPanel.tsx
'use client'
import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useSession } from 'next-auth/react'
import { useUserSettings } from '@/context/UserSettingsContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { CONNECT_HR_MONITOR_TITLE, MAX_HR_DEFAULT } from '@/utils/constants'
import { getHrZoneProps } from '@/utils/visualization'
import ConnectHRMonitorButton from './ConnectHRMonitorButton'
import HRMonitorStatusIndicator from './HRMonitorStatusIndicator'
import HrTile from '@/components/HrTile'

const HrmConnectionPanel = () => {
  const { data: session } = useSession()
  const [userSettings] = useUserSettings()
  const { hrmData, connectionStatus, activeAlerts } = useWebSocket()
  const {
    connect,
    disconnect,
    deviceStatus,
    batteryLevel,
    isConnected,
    isSupported,
  } = useBluetoothHRM()

  const handleConnect = () => {
    const userName =
      session?.user?.name || userSettings.userName || 'Unknown User'
    const userAge = userSettings.userAge || 30
    connect(userName, userAge)
  }

  const tileData = useMemo(() => {
    // Filter out users with placeholder names or no identity
    return hrmData
      .filter((user) => {
        const isPlaceholderName = !!user.name && /new user/i.test(user.name)
        const hasNoIdentity = user.name == null
        return !(isPlaceholderName || hasNoIdentity)
      })
      .map((user) => {
        const hrZoneProps = getHrZoneProps(
          user.value,
          user.maxHr || MAX_HR_DEFAULT
        )

        const matchingAlert = activeAlerts.find(
          (alert) =>
            alert.clientId === user.clientId &&
            (alert.code === 'BAD_PLACEMENT' || alert.code === 'HRM_STALE')
        )

        return {
          ...user,
          ...hrZoneProps,
          isAlerting: !!matchingAlert,
          alertMessage: matchingAlert?.message,
        }
      })
  }, [hrmData, activeAlerts])

  const isLoading =
    connectionStatus === 'Connecting...' ||
    connectionStatus === 'Reconnecting...'

  // If no tiles are available, show connection UI and skeletons
  // Note: This UI currently assumes a single, primary HRM connection.
  // Future iterations may need to address a multi-device connection strategy.
  return (
    <Box
      sx={{
        flexGrow: 1,
        width: { xs: '100%', lg: 'calc(50% - 16px)' },
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      {isLoading || tileData.length === 0 ? (
        <>
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
            <Typography variant="h6">{CONNECT_HR_MONITOR_TITLE}</Typography>
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
              display: { xs: 'none', md: 'block' },
              width: { sm: 'calc(50% - 12px)' },
            }}
          >
            <Skeleton
              variant="rectangular"
              height={220}
              sx={{ borderRadius: 3 }}
            />
          </Box>
        </>
      ) : (
        tileData.map((user) => (
          <Box
            key={user.clientId}
            data-testid="hr-tile-grid-item"
            sx={{
              width: {
                xs: '100%',
                sm: 'calc(50% - 8px)', // Adjusted for 16px gap (gap: 2)
              },
            }}
          >
            <HrTile
              name={user.name || ''}
              bpm={user.value}
              percentMax={user.percentage}
              calories={user.calories}
              isConnected={user.isConnected}
              isAlerting={user.isAlerting}
              {...(user.alertMessage && { alertMessage: user.alertMessage })}
            />
          </Box>
        ))
      )}
    </Box>
  )
}
export default HrmConnectionPanel

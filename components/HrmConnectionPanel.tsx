// File: app/components/dashboard/HrmConnectionPanel.tsx
'use client'
import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import useBluetoothHRM from '@/hooks/useBluetoothHRM.js'
import { useWebSocket } from '@/context/WebSocketContext.js'
import { CONNECT_HR_MONITOR_TITLE, MAX_HR_DEFAULT } from '@/utils/constants.js'
import { getHrZoneProps } from '@/utils/visualization.js'
import ConnectHRMonitorButton from './ConnectHRMonitorButton.jsx'
import HRMonitorStatusIndicator from './HRMonitorStatusIndicator.jsx'
import HrTile from '@/components/HrTile.jsx'

const HrmConnectionPanel = () => {
  const { hrmData, connectionStatus, activeAlerts } = useWebSocket()
  const {
    connectAndStream,
    disconnect,
    deviceStatus,
    batteryLevel,
    isConnected,
    isSupported,
  } = useBluetoothHRM()

  const handleConnect = () => {
    // TODO: Get user name and age from a reliable source
    connectAndStream('Local User', '30')
  }

  const filteredTiles = useMemo(() => {
    return hrmData
      .filter((user: HrmData) => {
        const isZero = user.value === 0
        const isPlaceholderName = !!user.name && /new user/i.test(user.name)
        const hasNoIdentity = user.name == null
        return !(isZero || isPlaceholderName || hasNoIdentity)
      })
      .map((user: HrmData) => {
        const hrZoneProps = getHrZoneProps(
          user.value,
          user.maxHr || MAX_HR_DEFAULT
        )

        const matchingAlert = activeAlerts.find(
          (alert: ActiveAlert) =>
            alert.clientId === user.clientId &&
            (alert.code === 'BAD_PLACEMENT' || alert.code === 'HRM_STALE')
        )

        return (
          <Box
            key={user.clientId}
            data-testid="hr-tile-grid-item"
            sx={{
              width: {
                xs: '100%',
                sm: 'calc(50% - 8px)',
                lg: 'calc(25% - 12px)',
              },
            }}
          >
            <HrTile
              name={user.name || ''}
              bpm={user.value}
              percentMax={hrZoneProps.percentage}
              isAlerting={!!matchingAlert}
              {...(matchingAlert && { alertMessage: matchingAlert.message })}
            />
          </Box>
        )
      })
  }, [hrmData, activeAlerts])

  const isLoading =
    connectionStatus === 'Connecting...' ||
    connectionStatus === 'Reconnecting...'

  // If no tiles are available, show connection UI and skeletons
  // Note: This UI currently assumes a single, primary HRM connection.
  // Future iterations may need to address a multi-device connection strategy.
  if (isLoading || filteredTiles.length === 0) {
    return (
      <>
        <Box
          sx={{
            width: { xs: '100%', md: 'calc(50% - 8px)' },
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
            width: { sm: 'calc(50% - 8px)', lg: 'calc(25% - 12px)' },
          }}
        >
          <Skeleton
            variant="rectangular"
            height={220}
            sx={{ borderRadius: 3 }}
          />
        </Box>
      </>
    )
  }

  return <>{filteredTiles}</>
}

export default HrmConnectionPanel

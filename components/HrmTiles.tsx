// File: app/components/dashboard/HrmTiles.tsx
'use client'
import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui//material/Typography'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import useUserPreferences from '@/hooks/useUserPreferences'
import { useWebSocket } from '@/context/WebSocketContext'
import { MAX_HR_DEFAULT } from '@/utils/constants'
import { getHrZoneProps } from '@/utils/visualization'
import ConnectHRMonitorButton from './ConnectHRMonitorButton'
import HRMonitorStatusIndicator from './HRMonitorStatusIndicator'
import HrTile from '@/components/HrTile'

const HrmTiles = () => {
  const { hrmData, connectionStatus, activeAlerts } = useWebSocket()
  const {
    connectAndStream,
    disconnect,
    deviceStatus,
    batteryLevel,
    isConnected,
    isSupported,
  } = useBluetoothHRM()
  const { user } = useUserPreferences()

  const handleConnect = () => {
    connectAndStream(user.name, user.age.toString())
  }

  const filteredTiles = useMemo(() => {
    return hrmData
      .filter((user) => {
        const isZero = user.value === 0
        const isPlaceholderName = !!user.name && /new user/i.test(user.name)
        const hasNoIdentity = user.name == null
        return !(isZero || isPlaceholderName || hasNoIdentity)
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

        return (
          <Grid
            item
            xs={12}
            sm={6}
            lg={3}
            key={user.clientId}
            data-testid="hr-tile-grid-item"
          >
            <HrTile
              name={user.name || ''}
              bpm={user.value}
              percentMax={hrZoneProps.percentage}
              isAlerting={!!matchingAlert}
              {...(matchingAlert && { alertMessage: matchingAlert.message })}
            />
          </Grid>
        )
      })
  }, [hrmData, activeAlerts])

  const isLoading =
    connectionStatus === 'Connecting...' ||
    connectionStatus === 'Reconnecting...'

  // If no tiles are available, show connection UI and skeletons
  if (isLoading || filteredTiles.length === 0) {
    return (
      <>
        <Grid item xs={12} md={6}>
          <Box
            sx={{
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
            <Typography variant="h6">Connect Your Heart Rate Monitor</Typography>
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
        </Grid>
        <Grid
          item
          xs={12}
          sm={6}
          lg={3}
          data-testid="hr-tile-grid-item"
          sx={{ display: { xs: 'none', md: 'block' } }}
        >
          <Skeleton
            variant="rectangular"
            height={220}
            sx={{ borderRadius: 3 }}
          />
        </Grid>
      </>
    )
  }

  return <>{filteredTiles}</>
}

export default HrmTiles

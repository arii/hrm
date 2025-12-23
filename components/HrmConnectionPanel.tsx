// File: app/components/dashboard/HrmConnectionPanel.tsx
'use client'
import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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
    connectAndStream,
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
    connectAndStream(userName, userAge)
  }

  const tileData = useMemo(() => {
    return hrmData
      .filter((user) => user.name && !/new user/i.test(user.name))
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
          alertMessage: matchingAlert?.message || 'Checking signal...',
        }
      })
  }, [hrmData, activeAlerts])

  const isLoading =
    connectionStatus === 'Connecting...' ||
    connectionStatus === 'Reconnecting...'

  const renderContent = () => {
    if (isLoading || tileData.length === 0) {
      return (
        <>
          <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: 220,
              }}
              elevation={2}
            >
              <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  {CONNECT_HR_MONITOR_TITLE}
                </Typography>
                <Box mt={2} mb={3}>
                  <HRMonitorStatusIndicator
                    deviceStatus={deviceStatus}
                    batteryLevel={batteryLevel}
                  />
                </Box>
                <ConnectHRMonitorButton
                  connect={handleConnect}
                  disconnect={disconnect}
                  isConnected={isConnected}
                  isSupported={isSupported}
                  deviceStatus={deviceStatus}
                />
              </CardContent>
            </Card>
          </Box>
          <Box
            sx={{
              width: { xs: '100%', sm: '50%' },
              display: { xs: 'none', sm: 'block' },
            }}
          >
            <Skeleton
              variant="rectangular"
              sx={{ borderRadius: 2, height: '100%', minHeight: 220 }}
            />
          </Box>
        </>
      )
    }

    return tileData.map((user) => (
      <Box
        key={user.clientId}
        sx={{ width: { xs: '100%', sm: '50%' }, minHeight: 220 }}
      >
        <HrTile
          name={user.name || ''}
          bpm={user.value}
          percentMax={user.percentage}
          calories={user.calories}
          isConnected={user.isConnected}
          isAlerting={user.isAlerting}
          alertMessage={user.alertMessage}
        />
      </Box>
    ))
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: { xs: 2, md: 3 },
      }}
    >
      {renderContent()}
    </Box>
  )
}
export default HrmConnectionPanel

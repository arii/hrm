// File: app/components/dashboard/HrmConnectionPanel.tsx
'use client'
import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
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
  const [userSettings, setUserSettings] = useUserSettings()
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
  if (isLoading || tileData.length === 0) {
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
          <FormControlLabel
            control={
              <Switch
                checked={userSettings.allowAutoStart}
                onChange={(e) =>
                  setUserSettings({
                    ...userSettings,
                    allowAutoStart: e.target.checked,
                  })
                }
                aria-label="Toggle automatic workout start when heart rate monitor connects"
              />
            }
            label="Auto-start workout on connect"
            sx={{ mt: 1 }}
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

  return (
    <>
      {tileData.map((user) => (
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
            percentMax={user.percentage}
            isConnected={user.isConnected}
            isAlerting={user.isAlerting}
            {...(user.alertMessage && { alertMessage: user.alertMessage })}
          />
        </Box>
      ))}
    </>
  )
}
export default HrmConnectionPanel

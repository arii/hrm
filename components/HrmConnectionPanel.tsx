// File: app/components/dashboard/HrmConnectionPanel.tsx
'use client'
import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useWebSocket } from '@/context/WebSocketContext'
import HrTileWrapper from '@/components/HrTileWrapper'

const HrmConnectionPanel = () => {
  const { hrmData, connectionStatus, activeAlerts } = useWebSocket()

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
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        height: '100%',
      }}
    >
      {isLoading || tileData.length === 0 ? (
        <>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              width: { xs: '100%', sm: 'calc(50% - 8px)' },
              height: '100%', // Ensure the container fills the grid cell
              gap: 2,
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" gutterBottom>
              No Heart Rate Data
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center">
              Heart rate data will be displayed here once a monitor is connected
              and streaming.
            </Typography>
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
            <HrTileWrapper user={user} />
          </Box>
        ))
      )}
    </Box>
  )
}
export default HrmConnectionPanel

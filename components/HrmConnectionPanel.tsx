'use client'
import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useWebSocket } from '@/context/WebSocketContext'
import { useNow } from '@/hooks/useNow'
import HrTileWrapper from '@/components/HrTileWrapper'
import { getActiveHrmData } from '@/utils/hrm'

const HrmConnectionPanel = () => {
  const { hrmData, connectionStatus, activeAlerts } = useWebSocket()
  const now = useNow()

  const tileData = useMemo(() => {
    return getActiveHrmData(hrmData, activeAlerts, now, {
      includeZeroValues: true,
    })
  }, [hrmData, activeAlerts, now])

  const isLoading =
    connectionStatus === 'Connecting...' ||
    connectionStatus === 'Reconnecting...'

  return (
    <Box
      data-testid="hrm-connection-panel"
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
        tileData.map((user) => {
          // Destructure to remove rapidly changing timestamps
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { updatedAt, lastUpdated, ...visualProps } = user
          return (
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
              <HrTileWrapper {...visualProps} />
            </Box>
          )
        })
      )}
    </Box>
  )
}
export default HrmConnectionPanel

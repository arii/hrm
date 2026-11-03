'use client'
import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useWebSocket } from '@/context/WebSocketContext'
import HrTile from '@/components/HrTile'
import { augmentHrmData } from '@/utils/hrm'
import { ClientHrmData } from '@/types/websocket'

const HrmConnectionPanel = () => {
  const { hrmData, connectionStatus, activeAlerts } = useWebSocket()
  const tileData = useMemo(() => {
    return augmentHrmData(hrmData, activeAlerts)
  }, [hrmData, activeAlerts])

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
      {isLoading ? (
        // Transient loading state: skeleton promises imminent content and must
        // disappear once connected. Never render it in the idle empty state:
        // a pulsing loader that never resolves both lies to users and trips
        // the VRT readiness gate (waits.ts treats MuiSkeleton as "loading").
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
          <Skeleton
            variant="rectangular"
            data-testid="hr-tile-grid-item"
            sx={{
              display: { xs: 'none', md: 'block' },
              width: { sm: 'calc(50% - 12px)' },
              height: 220,
              borderRadius: 3,
            }}
          />
        </>
      ) : tileData.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
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
      ) : (
        tileData.map((user: ClientHrmData) => {
          // Destructure to remove volatile timestamps causing re-renders
          const {
            updatedAt: _updatedAt,
            lastUpdated: _lastUpdated,
            ...tileProps
          } = user
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
              <HrTile {...tileProps} />
            </Box>
          )
        })
      )}
    </Box>
  )
}
export default HrmConnectionPanel

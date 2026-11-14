'use client'
import { useMemo } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import {
  useActiveAlerts,
  useHrmData,
  useWebSocketConnection,
} from '@/context/WebSocketContext'
import HrTile from '@/components/HrTile'
import { augmentHrmData } from '@/utils/hrm'
import { SCALED_CANVAS_SELECTOR, getHrGridConfig } from '@/constants/layout'
import { ClientHrmData } from '@/types/websocket'

const HrmConnectionPanel = () => {
  const hrmData = useHrmData()
  const activeAlerts = useActiveAlerts()
  const { connectionStatus } = useWebSocketConnection()
  const tileData = useMemo(() => {
    return augmentHrmData(hrmData, activeAlerts)
  }, [hrmData, activeAlerts])

  const isLoading =
    connectionStatus === 'Connecting...' ||
    connectionStatus === 'Reconnecting...'

  const hrCount = tileData.length
  const isCompact = hrCount >= 4
  const hrGridConfig = getHrGridConfig(hrCount)

  return (
    <Box
      data-testid="hrm-connection-panel"
      sx={{
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {isLoading ? (
        <Box
          data-testid="hrm-connection-loading"
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
          <CircularProgress />
          <Typography variant="body1" color="text.secondary" align="center">
            Connecting to live heart rate stream...
          </Typography>
        </Box>
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
          <Typography
            variant="h6"
            gutterBottom
            // Canvas-size text on the scaled canvas; default size on
            // responsive viewports.
            sx={{ [SCALED_CANVAS_SELECTOR]: { fontSize: '2.5rem' } }}
          >
            No Heart Rate Data
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            sx={{ [SCALED_CANVAS_SELECTOR]: { fontSize: '1.75rem' } }}
          >
            Heart rate data will be displayed here once a monitor is connected
            and streaming.
          </Typography>
        </Box>
      ) : (
        <Box
          data-testid="hr-tiles-container"
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: hrGridConfig.gridTemplateColumns,
            },
            gridTemplateRows: {
              xs: 'auto',
              sm: hrGridConfig.gridTemplateRows,
            },
            // The canvas pin rides the canvas selector: scaled viewports
            // are always ≥ SCALE_TO_FIT_MIN_WIDTH (the sm breakpoint),
            // but the selector keeps the pin explicit and above the
            // breakpoint rules.
            [SCALED_CANVAS_SELECTOR]: {
              gridTemplateColumns: hrGridConfig.gridTemplateColumns,
              gridTemplateRows: hrGridConfig.gridTemplateRows,
            },
            gap: isCompact ? 1.5 : 2,
            height: '100%',
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {tileData.map((user: ClientHrmData) => {
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
                sx={{ minHeight: 0, minWidth: 0, overflow: 'hidden' }}
              >
                <HrTile {...tileProps} isCompact={isCompact} />
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
export default HrmConnectionPanel

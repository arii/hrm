'use client'
import HrTileWrapper from '@/components/HrTileWrapper'
import { useWebSocket } from '@/context/WebSocketContext'
import { useNow } from '@/hooks/useNow'
import { getActiveHrmData } from '@/utils/hrm'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import { memo, useMemo } from 'react'

const HrmTiles = () => {
  const { hrmData, connectionStatus, activeAlerts } = useWebSocket()
  const now = useNow()

  const filteredTiles = useMemo(() => {
    return getActiveHrmData(hrmData, activeAlerts, now, {
      includeZeroValues: false,
    }).map((user) => {
      // Destructure to remove rapidly changing timestamps to allow React.memo to work effectively
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { updatedAt, lastUpdated, ...visualProps } = user

      return (
        <Grid
          size={{ xs: 12, sm: 6, lg: 3 }}
          key={user.clientId}
          data-testid="hr-tile-grid-item"
        >
          <HrTileWrapper {...visualProps} />
        </Grid>
      )
    })
  }, [hrmData, activeAlerts, now])

  const isLoading =
    connectionStatus === 'Connecting...' ||
    connectionStatus === 'Reconnecting...'

  if (isLoading || filteredTiles.length === 0) {
    return (
      <>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }} data-testid="hr-tile-grid-item">
          <Skeleton
            variant="rectangular"
            height={220}
            sx={{ borderRadius: 3 }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }} data-testid="hr-tile-grid-item">
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

// Memoize HrmTiles to prevent re-renders when parent components update.
export default memo(HrmTiles)

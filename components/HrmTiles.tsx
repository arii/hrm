'use client'
import HrTile from '@/components/HrTile'
import { useWebSocket } from '@/context/WebSocketContext'
import { useNow } from '@/hooks/useNow'
import { MAX_HR_DEFAULT } from '@/lib/shared/hr-zones'
import { getHrZoneProps } from '@/utils/visualization'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import { memo, useMemo } from 'react'
import { getActiveHrmData } from '@/utils/hrm'

const HrmTiles = () => {
  const { hrmData, connectionStatus, activeAlerts } = useWebSocket()
  const now = useNow()

  const filteredTiles = useMemo(() => {
    return getActiveHrmData(hrmData, activeAlerts, now, {
      includeZeroValues: false,
    }).map((user) => {
      const hrZoneProps = getHrZoneProps(
        user.value,
        user.maxHr || MAX_HR_DEFAULT
      )

      return (
        <Grid
          size={{ xs: 12, sm: 6, lg: 3 }}
          key={user.clientId}
          data-testid="hr-tile-grid-item"
        >
          <HrTile
            name={user.name || ''}
            bpm={user.value}
            percentMax={hrZoneProps.percentage}
            calories={user.calories || 0}
            isConnected={user.isConnected}
            isDataStale={user.isDataStale}
            isAlerting={user.isAlerting}
            {...(user.alertMessage && { alertMessage: user.alertMessage })}
          />
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

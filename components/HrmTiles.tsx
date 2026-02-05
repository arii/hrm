'use client'
import HrTile from '@/components/HrTile'
import { useWebSocket } from '@/context/WebSocketContext'
import { MAX_HR_DEFAULT } from '@/lib/shared/hr-zones'
import { getHrZoneProps } from '@/utils/visualization'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import { memo, useMemo } from 'react'
import { useFilteredHrmTiles } from '@/hooks/useFilteredHrmTiles'

const HrmTiles = () => {
  const { connectionStatus, activeAlerts } = useWebSocket()
  const filteredUsers = useFilteredHrmTiles()

  const tileElements = useMemo(() => {
    return filteredUsers.map((user) => {
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
          size={{ xs: 12, sm: 6, lg: 3 }}
          key={user.clientId}
          data-testid="hr-tile-grid-item"
        >
          <HrTile
            name={user.name || ''}
            bpm={user.value}
            percentMax={hrZoneProps.percentage}
            calories={user.calories || 0}
            isDataStale={user.isDataStale}
            isAlerting={!!matchingAlert}
            {...(matchingAlert && { alertMessage: matchingAlert.message })}
          />
        </Grid>
      )
    })
  }, [filteredUsers, activeAlerts])

  const isLoading =
    connectionStatus === 'Connecting...' ||
    connectionStatus === 'Reconnecting...'

  if (isLoading || tileElements.length === 0) {
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

  return <>{tileElements}</>
}

export default memo(HrmTiles)

// File: app/components/dashboard/HrmTiles.tsx
'use client'
import HrTile from '@/components/HrTile'
import { useWebSocket } from '@/context/WebSocketContext'
import { MAX_HR_DEFAULT } from '@/lib/shared/hr-zones'
import { getHrZoneProps } from '@/utils/visualization'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import { useMemo, useState, useEffect } from 'react'
import {
  STALE_TILE_DISPLAY_THRESHOLD_MS,
  STALE_TILE_REMOVAL_THRESHOLD_MS,
} from '@/utils/constants'

const HrmTiles = () => {
  const { hrmData, connectionStatus, activeAlerts } = useWebSocket()
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(interval)
  }, [])

  const filteredTiles = useMemo(() => {
    return hrmData
      .filter((user) => {
        const timeSinceUpdate = now - user.lastUpdated
        const isZero = user.value === 0
        const hasNoIdentity = user.name == null
        const isStale = timeSinceUpdate > STALE_TILE_REMOVAL_THRESHOLD_MS

        return !(isZero || hasNoIdentity || isStale)
      })
      .map((user) => {
        const hrZoneProps = getHrZoneProps(
          user.value,
          user.maxHr || MAX_HR_DEFAULT
        )
        const timeSinceUpdate = now - user.lastUpdated
        const isDataStale = timeSinceUpdate > STALE_TILE_DISPLAY_THRESHOLD_MS

        // Find the alert specific to this HR Monitor's clientId
        const matchingAlert = activeAlerts.find(
          (alert) =>
            alert.clientId === user.clientId &&
            (alert.code === 'BAD_PLACEMENT' || alert.code === 'HRM_STALE')
        )

        return (
          <Grid
            size={{ xs: 12, sm: 6, lg: 3 }}
            key={user.clientId}
            data-testid={`hr-tile-${user.clientId}`}
          >
            <HrTile
              name={user.name || ''}
              bpm={user.value}
              percentMax={hrZoneProps.percentage}
              calories={user.calories || 0} // Pass calories
              isConnected={user.isConnected}
              isDataStale={isDataStale}
              isAlerting={!!matchingAlert}
              // Conditionally add alertMessage to avoid passing `undefined`
              {...(matchingAlert && { alertMessage: matchingAlert.message })}
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

export default HrmTiles

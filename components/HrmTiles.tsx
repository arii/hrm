// File: app/components/dashboard/HrmTiles.tsx
'use client'
import HrTile from '@/components/HrTile'
import { useWebSocket } from '@/context/WebSocketContext'
import { MAX_HR_DEFAULT } from '@/lib/shared/hr-zones'
import { getHrZoneProps } from '@/utils/visualization'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import { memo, useMemo, useState, useEffect } from 'react'
import {
  STALE_TILE_DISPLAY_THRESHOLD_MS,
  STALE_TILE_REMOVAL_THRESHOLD_MS,
} from '@/utils/constants'

const HrmTiles = () => {
  const { hrmData, activeAlerts } = useWebSocket()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const filteredTiles = useMemo(() => {
    return hrmData
      .filter((user) => {
        const isZero = user.value === 0
        const hasNoIdentity = user.name == null

        // Filter out stale users based on removal threshold
        const timeSinceUpdate = now - (user.lastUpdated || 0)
        const isStale = timeSinceUpdate > STALE_TILE_REMOVAL_THRESHOLD_MS

        // Reducer already filters stale tiles, but we double check here for reactivity
        return !(isZero || hasNoIdentity || isStale)
      })
      .map((user) => {
        const hrZoneProps = getHrZoneProps(
          user.value,
          user.maxHr || MAX_HR_DEFAULT
        )
        const timeSinceUpdate = now - (user.lastUpdated || 0)
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

  // Show filtered tiles if available, otherwise show loading skeleton.
  // This prioritizes data visibility over connection status messaging.
  if (filteredTiles.length === 0) {
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

// Memoize HrmTiles to prevent re-renders.
// Reducer handles stale tile removal (35s TTL), this component adds visual indicators.
export default memo(HrmTiles)

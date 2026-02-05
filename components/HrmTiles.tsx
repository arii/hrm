// File: app/components/dashboard/HrmTiles.tsx
'use client'
import HrTile from '@/components/HrTile'
import { useWebSocket } from '@/context/WebSocketContext'
import { useNow } from '@/hooks/useNow'
import { MAX_HR_DEFAULT } from '@/lib/shared/hr-zones'
import {
  HRM_STALE_THRESHOLD_MS,
  HRM_WARNING_THRESHOLD_MS,
} from '@/utils/constants'
import { getHrZoneProps } from '@/utils/visualization'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import { memo, useMemo } from 'react'

const HrmTiles = () => {
  const { hrmData, connectionStatus, activeAlerts } = useWebSocket()
  const now = useNow()

  const filteredTiles = useMemo(() => {
    return hrmData
      .filter((user) => {
        const isZero = user.value === 0
        const isPlaceholderName = !!user.name && /new user/i.test(user.name)
        const hasNoIdentity = user.name == null

        // Forceful removal of stale tiles if data hasn't been seen within the threshold
        const isStale =
          user.lastUpdated && now - user.lastUpdated > HRM_STALE_THRESHOLD_MS

        return !(isZero || isPlaceholderName || hasNoIdentity || isStale)
      })
      .map((user) => {
        const hrZoneProps = getHrZoneProps(
          user.value,
          user.maxHr || MAX_HR_DEFAULT
        )

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
            data-testid="hr-tile-grid-item"
          >
            <HrTile
              name={user.name || ''}
              bpm={user.value}
              percentMax={hrZoneProps.percentage}
              calories={user.calories || 0} // Pass calories
              isConnected={user.isConnected}
              // Data is considered stale if not seen within threshold (visual warning)
              isDataStale={
                !!(
                  user.lastUpdated &&
                  now - user.lastUpdated > HRM_WARNING_THRESHOLD_MS
                )
              }
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

// Memoize HrmTiles to prevent re-renders when parent components update.
// The component relies on the `useWebSocket` hook, which provides `hrmData` and `activeAlerts`.
// The `useMemo` hook inside the component ensures that the `filteredTiles` are only recalculated
// when `hrmData` or `activeAlerts` change, further optimizing performance.
export default memo(HrmTiles)

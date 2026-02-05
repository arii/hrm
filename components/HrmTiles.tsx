// File: app/components/dashboard/HrmTiles.tsx
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
            isDataStale={user.isDataStale}
            isAlerting={!!matchingAlert}
            // Conditionally add alertMessage to avoid passing `undefined`
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

// Memoize HrmTiles to prevent re-renders when parent components update.
// The component relies on the `useWebSocket` hook, which provides `hrmData` and `activeAlerts`.
// The `useMemo` hook inside the component ensures that the `filteredTiles` are only recalculated
// when `hrmData` or `activeAlerts` change, further optimizing performance.
export default memo(HrmTiles)

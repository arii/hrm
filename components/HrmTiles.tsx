// File: app/components/dashboard/HrmTiles.tsx
'use client'
import HrTile from '@/components/HrTile'
import { useWebSocket } from '@/context/WebSocketContext'
import { MAX_HR_DEFAULT } from '@/utils/constants'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import { memo, useMemo } from 'react'
import { useHrZone } from '@/hooks/useHrZone'
import { HrmData } from '@/types/websocket'

const MemoizedHrTile = memo(
  ({
    user,
    matchingAlert,
  }: {
    user: HrmData
    matchingAlert: { message: string } | undefined
  }) => {
    const hrZoneProps = useHrZone(user.value, user.maxHr || MAX_HR_DEFAULT)
    return (
      <HrTile
        name={user.name || ''}
        bpm={user.value}
        percentMax={hrZoneProps.percentage}
        calories={user.calories || 0}
        isAlerting={!!matchingAlert}
        maxHr={user.maxHr || MAX_HR_DEFAULT}
        {...(matchingAlert && { alertMessage: matchingAlert.message })}
      />
    )
  }
)
MemoizedHrTile.displayName = 'MemoizedHrTile'

const HrmTiles = () => {
  const { hrmData, connectionStatus, activeAlerts } = useWebSocket()

  const filteredTiles = useMemo(() => {
    return hrmData
      .filter((user) => {
        const isZero = user.value === 0
        const isPlaceholderName = !!user.name && /new user/i.test(user.name)
        const hasNoIdentity = user.name == null
        return !(isZero || isPlaceholderName || hasNoIdentity)
      })
      .map((user) => {
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
            <MemoizedHrTile user={user} matchingAlert={matchingAlert} />
          </Grid>
        )
      })
  }, [hrmData, activeAlerts])

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

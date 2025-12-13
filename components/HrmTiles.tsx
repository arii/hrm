// File: app/components/dashboard/HrmTiles.tsx
'use client'
import HrTile from '@/components/HrTile'
import { useWebSocket } from '@/context/WebSocketContext'
import { MAX_HR_DEFAULT } from '@/utils/constants'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import { useMemo } from 'react'

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
        const percentMax = Math.round(
          (user.value / (user.maxHr || MAX_HR_DEFAULT)) * 100
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
              percentMax={percentMax}
              maxHr={user.maxHr || MAX_HR_DEFAULT}
              isAlerting={!!matchingAlert}
              // Conditionally add alertMessage to avoid passing `undefined`
              {...(matchingAlert && { alertMessage: matchingAlert.message })}
            />
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

export default HrmTiles

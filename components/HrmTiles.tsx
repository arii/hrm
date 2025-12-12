// File: app/components/dashboard/HrmTiles.tsx
'use client'
import HrTile from '@/components/HrTile'
import { useWebSocket } from '@/context/WebSocketContext'
import { MAX_HR_DEFAULT } from '@/utils/constants'
import { getHrZoneProps } from '@/utils/visualization'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import { useMemo } from 'react'

const gridItemSize = { xs: 12, sm: 6, lg: 3 }

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
            size={gridItemSize}
            key={user.clientId}
            data-testid="hr-tile-grid-item"
          >
            <HrTile
              name={user.name || ''}
              bpm={user.value}
              percentMax={hrZoneProps.percentage}
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
        <Grid size={gridItemSize} data-testid="hr-tile-grid-item">
          <Skeleton
            variant="rectangular"
            height={220}
            sx={{ borderRadius: 3 }}
          />
        </Grid>
        <Grid size={gridItemSize} data-testid="hr-tile-grid-item">
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

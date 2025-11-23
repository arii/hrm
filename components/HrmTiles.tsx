// File: app/components/dashboard/HrmTiles.tsx
'use client'
import { HrTile } from '@/components/Card'
import { useWebSocket } from '@/context/WebSocketContext'
import { MAX_HR_DEFAULT } from '@/utils/constants'
import { getHrZoneProps } from '@/utils/visualization'
import { Grid, Skeleton } from '@mui/material'

const HrmTiles = () => {
  const { hrmData } = useWebSocket()

  if (hrmData.length > 0) {
    return (
      <>
        {hrmData
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
            return (
              <Grid
                item
                xs={12}
                sm={6}
                lg={3}
                key={user.clientId}
                data-testid="hr-tile-grid-item"
              >
                <HrTile
                  name={user.name || ''}
                  bpm={user.value}
                  percentMax={hrZoneProps.percentage}
                  background={hrZoneProps.progressColor}
                />
              </Grid>
            )
          })}
      </>
    )
  }

  return (
    <>
      <Grid item xs={12} sm={6} lg={3} data-testid="hr-tile-grid-item">
        <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 3 }} />
      </Grid>
      <Grid item xs={12} sm={6} lg={3} data-testid="hr-tile-grid-item">
        <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 3 }} />
      </Grid>
    </>
  )
}

export default HrmTiles

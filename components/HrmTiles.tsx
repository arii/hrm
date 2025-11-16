// File: components/HrmTiles.tsx
'use client'
import HrTile from '@/components/HrTile'
import useWebSocket from '@/hooks/useWebSocket'
import { MAX_HR_DEFAULT } from '@/utils/constants'
import { getHrZoneProps } from '@/utils/visualization'
import { Grid, Skeleton } from '@mui/material'

const HrmTiles = () => {
  const { hrmData } = useWebSocket()

  // Filter out users with no data or placeholder names
  const validUsers = hrmData.filter(
    (user) =>
      user.value > 0 && user.name && !/new user/i.test(user.name)
  )

  if (validUsers.length > 0) {
    return (
      <>
        {validUsers.map((user) => {
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
                bpm={hrZoneProps.bpm}
                percentMax={hrZoneProps.percentage}
                color={hrZoneProps.color}
              />
            </Grid>
          )
        })}
      </>
    )
  }

  // Display skeleton loaders when no data is available
  return (
    <>
      {[...Array(2)].map((_, index) => (
        <Grid item xs={12} sm={6} lg={3} key={index}>
          <Skeleton
            variant="rectangular"
            height={250}
            sx={{ borderRadius: 2 }}
          />
        </Grid>
      ))}
    </>
  )
}

export default HrmTiles

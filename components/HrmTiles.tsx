// File: app/components/dashboard/HrmTiles.tsx
'use client'
import { useEffect, useState } from 'react'
import HeartRateGraph from '@/components/HeartRateGraph'
import HrTile from '@/components/HrTile'
import { useWebSocket } from '@/context/WebSocketContext'
import { MAX_HR_DEFAULT } from '@/utils/constants'
import { getHrZoneProps } from '@/utils/visualization'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'

const HrmTiles = () => {
  const { hrmData } = useWebSocket()
  const [heartRateHistory, setHeartRateHistory] = useState<Record<string, { time: number; bpm: number }[]>>({})

  useEffect(() => {
    if (hrmData.length > 0) {
      const now = Date.now()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHeartRateHistory((prevHistory) => {
        const newHistory = { ...prevHistory }
        hrmData.forEach((user) => {
          if (user.clientId) {
            const userHistory = newHistory[user.clientId] || []
            const newUserHistory = [...userHistory, { time: now, bpm: user.value }]
            // Keep the last 50 data points
            newHistory[user.clientId] = newUserHistory.slice(-50)
          }
        })
        return newHistory
      })
    }
  }, [hrmData])

  if (hrmData.length > 0) {
    const filteredUsers = hrmData.filter((user) => {
      const isZero = user.value === 0
      const isPlaceholderName = !!user.name && /new user/i.test(user.name)
      const hasNoIdentity = user.name == null
      return !(isZero || isPlaceholderName || hasNoIdentity)
    })

    const primaryUser = filteredUsers.length > 0 ? filteredUsers[0] : null

    return (
      <>
        {filteredUsers.map((user) => {
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
        {primaryUser && (
          <Grid item xs={12} mt={2}>
            <HeartRateGraph
              data={heartRateHistory[primaryUser.clientId] || []}
              width={1200}
              height={300}
            />
          </Grid>
        )}
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

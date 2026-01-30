// app/client/experimental/components/ZoneDistribution.tsx
'use client'
import { Card, CardContent, Typography, Box } from '@mui/material'
import { HrZoneName } from '@/lib/workout-session-storage'

interface ZoneDistributionProps {
  timeInZones: Record<HrZoneName, number>
  totalDuration: number
}

const ZoneDistribution = ({
  timeInZones,
  totalDuration,
}: ZoneDistributionProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Time in Zones
        </Typography>
        {Object.entries(timeInZones)
          .filter(
            ([zone]) =>
              zone !== HrZoneName.NoData && zone !== HrZoneName.Unknown
          )
          .map(([zone, time]) => {
            if (time === 0) return null
            const percentage =
              totalDuration > 0 ? ((time / totalDuration) * 100).toFixed(1) : 0
            return (
              <Box
                key={zone}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  my: 1,
                }}
              >
                <Typography variant="body1">{zone}</Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2">{formatTime(time)}</Typography>
                  <Typography variant="caption">{percentage}%</Typography>
                </Box>
              </Box>
            )
          })}
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution

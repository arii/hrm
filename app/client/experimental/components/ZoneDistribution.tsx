// app/client/experimental/components/ZoneDistribution.tsx
'use client'
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material'
import { HrZoneName } from '@/lib/shared/hr-zones'
import { formatDuration } from '@/lib/utils'

interface ZoneDistributionProps {
  timeInZones: Record<HrZoneName, number>
  totalDuration: number
}

const ZoneDistribution = ({
  timeInZones,
  totalDuration,
}: ZoneDistributionProps) => {
  return (
    <Card elevation={2} data-testid="zone-distribution">
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Time in Zones
        </Typography>
        {Object.entries(timeInZones)
          .filter(
            ([zone]) =>
              ![HrZoneName.NoData, HrZoneName.Unknown].includes(
                zone as HrZoneName
              )
          )
          .map(([zone, time]) => {
            const percentage =
              totalDuration > 0 ? (time / totalDuration) * 100 : 0
            if (percentage < 1) return null // Hide negligible data

            return (
              <Box key={zone} mb={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" fontWeight="medium">
                    {zone}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {formatDuration(time, {
                      unit: 'seconds',
                      format: 'MM:SS',
                    })}{' '}
                    ({percentage.toFixed(1)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={percentage}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )
          })}
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution

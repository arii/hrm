'use client'

import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  useTheme,
} from '@mui/material'
import { HrZoneName, HR_ZONE_COLOR_MAP } from '@/lib/shared/hr-zones'

interface ZoneDistributionProps {
  timeInZones: Record<HrZoneName, number>
  totalDuration: number
}

const ZoneDistribution: React.FC<ZoneDistributionProps> = ({
  timeInZones,
  totalDuration,
}) => {
  const theme = useTheme()

  const filteredEntries = Object.entries(timeInZones).filter(
    ([zone, time]) =>
      zone !== HrZoneName.NoData &&
      zone !== HrZoneName.Unknown &&
      (totalDuration > 0 ? (time / totalDuration) * 100 : 0) >= 1
  )

  if (filteredEntries.length === 0) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Time in Zones
          </Typography>
          <Typography variant="body2" color="textSecondary">
            No zone data available for this session.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Time in Zones
        </Typography>
        {filteredEntries.map(([zone, time]) => {
          const percentage =
            totalDuration > 0 ? (time / totalDuration) * 100 : 0
          const color = HR_ZONE_COLOR_MAP[zone] || theme.palette.grey[500]

          return (
            <Box key={zone} mb={2}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" fontWeight="medium">
                  {zone}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {Math.floor(time / 60)}m {Math.floor(time % 60)}s (
                  {percentage.toFixed(1)}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={percentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.palette.grey[200],
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: color,
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution

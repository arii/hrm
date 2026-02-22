// app/client/experimental/components/ZoneDistribution.tsx
'use client'

import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  LinearProgress,
} from '@mui/material'
import {
  HeartRateZone,
  HR_ZONE_CONFIG,
  HR_ZONE_ORDER,
} from '@/lib/shared/hr-zones'
import { formatDuration } from '@/lib/utils'

// --- Types ---
interface ZoneDistributionProps {
  timeInZones: Record<HeartRateZone, number>
}

// --- Constants & Helpers ---

const ZoneDistribution: React.FC<ZoneDistributionProps> = ({ timeInZones }) => {
  const theme = useTheme()

  const totalDuration = useMemo(() => {
    return Object.values(timeInZones).reduce((acc, curr) => acc + curr, 0)
  }, [timeInZones])

  const data = useMemo(() => {
    return HR_ZONE_ORDER.map((zoneKey) => {
      const time = timeInZones[zoneKey] || 0
      const config = HR_ZONE_CONFIG[zoneKey]
      const percentage = totalDuration > 0 ? (time / totalDuration) * 100 : 0
      return {
        name: config.label,
        value: time,
        percentage: parseFloat(percentage.toFixed(1)),
        formattedTime: formatDuration(time, {
          unit: 'seconds',
          format: 'MM:SS',
          noPadMinutes: true,
        }),
        color: config.color,
      }
    })
  }, [timeInZones, totalDuration])

  // Filter out negligible data for visual clarity
  const visibleData = useMemo(
    () => data.filter((d) => d.percentage >= 1),
    [data]
  )

  if (totalDuration === 0) {
    return (
      <Card elevation={3}>
        <CardContent>
          <Typography
            variant="h6"
            component="h2"
            gutterBottom
            fontWeight="bold"
          >
            Heart Rate Zone Distribution
          </Typography>
          <Typography variant="body2" color="textSecondary">
            No zone data available for this session.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card elevation={3}>
      {/* Visually hidden table for screen reader accessibility */}
      <Box
        component="table"
        sx={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        <caption>Heart Rate Zone Distribution Data Table</caption>
        <thead>
          <tr>
            <th scope="col">Zone</th>
            <th scope="col">Duration</th>
            <th scope="col">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={`sr-row-${item.name}`}>
              <td>{item.name}</td>
              <td>{item.formattedTime}</td>
              <td>{item.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </Box>

      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom fontWeight="bold">
          Heart Rate Zone Distribution
        </Typography>

        <Box display="flex" flexDirection="column" gap={2}>
          {visibleData.map((item) => (
            <Box key={item.name}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={0.5}
              >
                <Typography variant="body2" fontWeight={600}>
                  {item.name}
                </Typography>
                <Box textAlign="right">
                  <Typography
                    variant="body2"
                    component="span"
                    fontWeight="bold"
                    mr={1}
                  >
                    {item.formattedTime}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    ({item.percentage}%)
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={item.percentage}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: theme.palette.grey[200],
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: item.color,
                    borderRadius: 5,
                  },
                }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution

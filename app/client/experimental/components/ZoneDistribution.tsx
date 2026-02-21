'use client'

import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  useTheme,
} from '@mui/material'
import {
  HeartRateZone,
  HR_ZONE_CONFIG,
  HR_ZONE_ORDER,
} from '@/lib/shared/hr-zones'
import { formatDuration } from '@/lib/utils'

interface ZoneDistributionProps {
  timeInZones: Record<HeartRateZone, number>
  totalDuration?: number
}

const ZoneDistribution: React.FC<ZoneDistributionProps> = ({
  timeInZones,
  totalDuration: providedTotalDuration,
}) => {
  const theme = useTheme()

  const calculatedTotalDuration = useMemo(() => {
    return Object.values(timeInZones).reduce((sum, time) => sum + time, 0)
  }, [timeInZones])

  const totalDuration = providedTotalDuration ?? calculatedTotalDuration

  const data = useMemo(() => {
    return HR_ZONE_ORDER.map((zone) => {
      const time = timeInZones[zone] || 0
      const percentage = totalDuration > 0 ? (time / totalDuration) * 100 : 0
      return {
        zone,
        time,
        percentage,
        formattedTime: formatDuration(time, {
          unit: 'seconds',
          format: 'MM:SS',
          noPadMinutes: true,
        }),
        color: HR_ZONE_CONFIG[zone].color,
        label: HR_ZONE_CONFIG[zone].label,
      }
    }).filter((item) => item.time > 0)
  }, [timeInZones, totalDuration])

  if (data.length === 0) {
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
              <tr key={`sr-row-${item.zone}`}>
                <td>{item.label}</td>
                <td>{item.formattedTime}</td>
                <td>{item.percentage.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {data.map((item) => {
            const labelId = `zone-label-${item.zone}`
            const valueId = `zone-value-${item.zone}`
            return (
              <Box key={item.zone}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 0.5,
                  }}
                >
                  <Typography id={labelId} variant="body2" fontWeight={600}>
                    {item.label}
                  </Typography>
                  <Typography
                    id={valueId}
                    variant="body2"
                    color="textSecondary"
                  >
                    {item.formattedTime} ({item.percentage.toFixed(1)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={item.percentage}
                  aria-labelledby={`${labelId} ${valueId}`}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: theme.palette.grey[200],
                    '& .MuiLinearProgress-bar': {
                      bgcolor: item.color,
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>
            )
          })}
        </Box>
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution

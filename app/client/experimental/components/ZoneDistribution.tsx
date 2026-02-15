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

  const filteredEntries = Object.entries(timeInZones)
    .filter(
      ([zone, time]) =>
        zone !== HrZoneName.NoData &&
        zone !== HrZoneName.Unknown &&
        (totalDuration > 0 ? (time / totalDuration) * 100 : 0) >= 1
    )
    .map(([zone, time]) => {
      const percentage = totalDuration > 0 ? (time / totalDuration) * 100 : 0
      return {
        zone,
        time,
        percentage,
        formattedTime: `${Math.floor(time / 60)}m ${Math.floor(time % 60)}s`,
        color: HR_ZONE_COLOR_MAP[zone] || theme.palette.grey[500],
      }
    })

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
          {filteredEntries.map((item) => (
            <tr key={`sr-row-${item.zone}`}>
              <td>{item.zone}</td>
              <td>{item.formattedTime}</td>
              <td>{item.percentage.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </Box>

      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Time in Zones
        </Typography>
        {filteredEntries.map((item) => {
          return (
            <Box key={item.zone} mb={2}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" fontWeight="medium">
                  {item.zone}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {item.formattedTime} ({item.percentage.toFixed(1)}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={item.percentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.palette.grey[200],
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: item.color,
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

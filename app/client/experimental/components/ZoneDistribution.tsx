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
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface ZoneDistributionProps {
  timeInZones: Record<HeartRateZone, number>
  totalDuration: number
}

const ZoneDistribution: React.FC<ZoneDistributionProps> = ({
  timeInZones,
  totalDuration,
}) => {
  const theme = useTheme()

  const allRelevantEntries = useMemo(() => {
    // Sort by intensity (highest to lowest) for the list
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
    }).filter((item) => item.time > 0) // Basic filter for non-zero time
  }, [timeInZones, totalDuration])

  const filteredEntries = useMemo(() => {
    return allRelevantEntries.filter((item) => item.percentage >= 1)
  }, [allRelevantEntries])

  const chartData = useMemo(() => {
    return allRelevantEntries.map((item) => ({
      name: item.label,
      value: item.time,
      percentage: parseFloat(item.percentage.toFixed(1)),
      formattedTime: item.formattedTime,
      color: item.color,
    }))
  }, [allRelevantEntries])

  const hasNegligibleData =
    allRelevantEntries.length > filteredEntries.length &&
    filteredEntries.length > 0

  if (allRelevantEntries.length === 0) {
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
              <td>{item.label}</td>
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

        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          gap={4}
          alignItems="flex-start"
        >
          {/* List Section */}
          <Box flex={1} width="100%">
            {filteredEntries.map((item) => (
              <Box key={item.zone} mb={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" fontWeight="medium">
                    {item.label}
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
                  aria-label={`${item.label} zone progress`}
                  aria-valuenow={Math.round(item.percentage)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </Box>
            ))}
            {hasNegligibleData && (
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}
              >
                Zones with less than 1% duration are hidden for clarity.
              </Typography>
            )}
          </Box>

          {/* Chart Section */}
          <Box
            width={{ xs: '100%', sm: '40%' }}
            height={250}
            position="relative"
            role="img"
            aria-label={`Donut chart showing heart rate zone distribution. Total duration: ${formatDuration(
              totalDuration,
              { unit: 'seconds', format: 'MM:SS', noPadMinutes: true }
            )}.`}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number | undefined) =>
                    [
                      formatDuration(value || 0, {
                        unit: 'seconds',
                        format: 'MM:SS',
                        noPadMinutes: true,
                      }),
                      'Duration',
                    ] as [string, string]
                  }
                  contentStyle={{
                    borderRadius: theme.shape.borderRadius,
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: theme.shadows[3],
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <Box
              position="absolute"
              top={0}
              left={0}
              bottom={0}
              right={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
              sx={{ pointerEvents: 'none' }}
            >
              <Typography variant="caption" color="textSecondary">
                Total
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatDuration(totalDuration, {
                  unit: 'seconds',
                  format: 'MM:SS',
                  noPadMinutes: true,
                })}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution

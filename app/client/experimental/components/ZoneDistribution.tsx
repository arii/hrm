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
  totalDuration: number
}

const ZoneDistribution: React.FC<ZoneDistributionProps> = ({
  timeInZones,
  totalDuration,
}) => {
  const theme = useTheme()

  const allRelevantEntries = useMemo(() => {
    return Object.entries(timeInZones).filter(
      ([zone]) => zone !== HrZoneName.NoData && zone !== HrZoneName.Unknown
    )
  }, [timeInZones])

  const filteredEntries = useMemo(() => {
    return allRelevantEntries
      .filter(
        ([, time]) =>
          // Hide negligible data (< 1%) to maintain visual density and professional polish
          (totalDuration > 0 ? (time / totalDuration) * 100 : 0) >= 1
      )
      .map(([zone, time]) => {
        const percentage = totalDuration > 0 ? (time / totalDuration) * 100 : 0
        return {
          zone,
          time,
          percentage,
          formattedTime: formatDuration(time, {
            unit: 'seconds',
            format: 'MM:SS',
          }),
          color: HR_ZONE_COLOR_MAP[zone] || theme.palette.grey[500],
        }
      })
      .sort((a, b) => {
        return HR_ZONE_ORDER.indexOf(a.zone) - HR_ZONE_ORDER.indexOf(b.zone)
      })
  }, [allRelevantEntries, totalDuration, theme.palette.grey])
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

  const chartData = useMemo(() => data.filter((d) => d.value > 0), [data])

  const hasNegligibleData =
    allRelevantEntries.length > filteredEntries.length &&
    filteredEntries.length > 0

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

        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          gap={2}
          alignItems="center"
        >
          {/* Chart Section */}
          <Box
            width={{ xs: '100%', sm: '50%' }}
            height={200}
            position="relative"
            role="img"
            aria-label={`Donut chart showing heart rate zone distribution. Total duration: ${formatDuration(
              totalDuration,
              { unit: 'seconds', format: 'MM:SS', noPadMinutes: true }
            )}.`}
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
          )
        })}
        {hasNegligibleData && (
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}
          >
            Zones with less than 1% duration are hidden for clarity.
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution

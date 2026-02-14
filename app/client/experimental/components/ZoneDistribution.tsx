// app/client/experimental/components/ZoneDistribution.tsx
'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import {
  HrZoneName,
  HR_ZONE_COLOR_MAP,
  HR_ZONE_ORDER,
} from '@/lib/shared/hr-zones'
import { formatDuration } from '@/lib/utils'

// --- Types ---
interface ZoneDistributionProps {
  timeInZones: Record<HrZoneName, number>
  totalDuration: number
}

// --- Constants & Helpers ---

// Strict time formatter: "MM:SS" (e.g., "25:40")
const formatTime = (seconds: number): string => {
  return formatDuration(seconds, {
    unit: 'seconds',
    format: 'MM:SS',
    noPadMinutes: true,
  })
}

const ZoneDistribution: React.FC<ZoneDistributionProps> = ({
  timeInZones,
  totalDuration,
}) => {
  const theme = useTheme()

  // Transform data for Recharts and list display
  const data = useMemo(() => {
    return (
      Object.entries(timeInZones)
        .filter(
          ([zone]) => zone !== HrZoneName.NoData && zone !== HrZoneName.Unknown
        )
        .map(([zone, time]) => {
          const percentage =
            totalDuration > 0 ? (time / totalDuration) * 100 : 0
          return {
            name: zone,
            value: time,
            percentage: parseFloat(percentage.toFixed(1)),
            formattedTime: formatTime(time),
            color: HR_ZONE_COLOR_MAP[zone] || theme.palette.grey[500],
          }
        })
        // Filter out zero values to keep the chart clean
        .filter((item) => item.value > 0)
        // Sort by intensity (Max to Idle/Recovery)
        .sort(
          (a, b) =>
            HR_ZONE_ORDER.indexOf(a.name) - HR_ZONE_ORDER.indexOf(b.name)
        )
    )
  }, [timeInZones, totalDuration, theme.palette.grey])

  if (data.length === 0) {
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
            aria-label={`Donut chart showing heart rate zone distribution. Total duration: ${formatTime(
              totalDuration
            )}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number | undefined) =>
                    [formatTime(value || 0), 'Duration'] as [string, string]
                  }
                  contentStyle={{
                    borderRadius: theme.shape.borderRadius,
                    border: 'none',
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
                {formatTime(totalDuration)}
              </Typography>
            </Box>
          </Box>

          {/* Legend / List Section */}
          <Box
            width={{ xs: '100%', sm: '50%' }}
            display="flex"
            flexDirection="column"
            gap={1}
          >
            {data.map((item) => (
              <Box
                key={item.name}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                p={0.5}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Box
                    width={12}
                    height={12}
                    borderRadius="50%"
                    bgcolor={item.color}
                  />
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="textPrimary"
                  >
                    {item.name}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {item.formattedTime}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {item.percentage}%
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution

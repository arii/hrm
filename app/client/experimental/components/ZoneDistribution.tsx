// app/client/experimental/components/ZoneDistribution.tsx
'use client'

import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  Stack,
} from '@mui/material'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { HrZoneName } from '@/lib/shared/hr-zones'
// Import global constants for consistent coloring
import { HEART_RATE_ZONES } from '@/utils/constants'

// --- Types ---
interface ZoneDistributionProps {
  timeInZones: Record<HrZoneName, number>
  totalDuration: number
}

// --- Constants & Helpers ---

// Map your domain "HrZoneName" enum to the UI colors defined in HEART_RATE_ZONES
// We map these explicitly to ensure domain names match visual expectations
const ZONE_COLOR_MAP: Record<string, string> = {
  [HrZoneName.Max]:
    HEART_RATE_ZONES.find((z) => z.name === 'Zone 5')?.color || '#F44336',
  [HrZoneName.Peak]:
    HEART_RATE_ZONES.find((z) => z.name === 'Zone 4')?.color || '#FFEB3B',
  [HrZoneName.Cardio]:
    HEART_RATE_ZONES.find((z) => z.name === 'Zone 3')?.color || '#4CAF50',
  [HrZoneName.FatBurn]:
    HEART_RATE_ZONES.find((z) => z.name === 'Zone 2')?.color || '#2196F3',
  [HrZoneName.WarmUp]:
    HEART_RATE_ZONES.find((z) => z.name === 'Zone 1')?.color || '#9E9E9E',
  [HrZoneName.NoData]: '#e0e0e0',
  [HrZoneName.Unknown]: '#9e9e9e',
}

// Strict time formatter: "MM:SS" (e.g., "25:40")
const formatTime = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const ZoneDistribution: React.FC<ZoneDistributionProps> = ({
  timeInZones,
  totalDuration,
}) => {
  const theme = useTheme()

  // Transform data for Recharts and list display
  // Memoized to prevent recalculation on unrelated renders
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
            color: ZONE_COLOR_MAP[zone] || theme.palette.grey[500],
          }
        })
        // Sort by intensity usually makes sense, but data order might suffice.
        // Filter out zero values to keep the chart clean
        .filter((item) => item.value > 0)
    )
  }, [timeInZones, totalDuration, theme.palette.grey])

  if (data.length === 0) {
    return null
  }

  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom fontWeight="bold">
          Heart Rate Zone Distribution
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems="flex-start"
          width="100%"
        >
          {/* Chart Section */}
          <Box
            width={{ xs: '100%', sm: '50%' }}
            minHeight={200}
            position="relative"
          >
            <ResponsiveContainer width="100%" height={200}>
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
                  formatter={(value) => [
                    formatTime(Number(value || 0)),
                    'Duration',
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
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
        </Stack>
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution

'use client'

import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  Palette,
} from '@mui/material'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { HrZoneName } from '@/lib/shared/hr-zones'
import { formatDuration } from '@/lib/utils'

// --- Types ---
interface ZoneDistributionProps {
  timeInZones: Record<HrZoneName, number>
  totalDuration: number
}

// --- Constants & Helpers ---

// Order of zones for sorting (High intensity to Low intensity)
const ZONE_PRIORITY: Record<HrZoneName, number> = {
  [HrZoneName.Max]: 0,
  [HrZoneName.Peak]: 1,
  [HrZoneName.Cardio]: 2,
  [HrZoneName.FatBurn]: 3,
  [HrZoneName.WarmUp]: 4,
  [HrZoneName.NoData]: 5,
  [HrZoneName.Unknown]: 6,
  [HrZoneName.Recovery]: 7,
  [HrZoneName.Aerobic]: 8,
  [HrZoneName.Idle]: 9,
}

const ZONE_COLOR_KEY_MAP: Partial<
  Record<HrZoneName, keyof Palette['custom']['hrZones']>
> = {
  [HrZoneName.Max]: 'max',
  [HrZoneName.Peak]: 'peak',
  [HrZoneName.Cardio]: 'cardio',
  [HrZoneName.FatBurn]: 'fatBurn',
  [HrZoneName.WarmUp]: 'warmUp',
  [HrZoneName.Recovery]: 'recovery',
  [HrZoneName.Idle]: 'idle',
}

const ZoneDistribution: React.FC<ZoneDistributionProps> = ({
  timeInZones,
  totalDuration,
}) => {
  const theme = useTheme()

  // Transform data for Recharts and list display
  // Memoized to prevent recalculation on unrelated renders
  const data = useMemo(() => {
    return Object.entries(timeInZones)
      .filter(
        ([zone]) => zone !== HrZoneName.NoData && zone !== HrZoneName.Unknown
      )
      .map(([zone, time]) => {
        const percentage = totalDuration > 0 ? (time / totalDuration) * 100 : 0
        const zoneName = zone as HrZoneName

        // Get color from theme
        const colorKey = ZONE_COLOR_KEY_MAP[zoneName]
        const color =
          colorKey && theme.palette.custom?.hrZones?.[colorKey]
            ? theme.palette.custom.hrZones[colorKey]
            : theme.palette.grey[500]

        return {
          name: zoneName,
          value: time,
          percentage: parseFloat(percentage.toFixed(1)),
          // Use standard formatDuration utility (MM:SS)
          formattedTime: formatDuration(time, {
            unit: 'seconds',
            format: 'MM:SS',
          }),
          color,
        }
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => {
        const priorityA = ZONE_PRIORITY[a.name] ?? 99
        const priorityB = ZONE_PRIORITY[b.name] ?? 99
        return priorityA - priorityB
      })
  }, [timeInZones, totalDuration, theme])

  if (data.length === 0) {
    return null
  }

  return (
    <Card elevation={3} data-testid="zone-distribution-card">
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
            role="region"
            aria-label="Heart rate zone distribution chart"
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
                  formatter={(value: number | undefined) => [
                    formatDuration(value ?? 0, {
                      unit: 'seconds',
                      format: 'MM:SS',
                    }),
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
                {formatDuration(totalDuration, {
                  unit: 'seconds',
                  format: 'MM:SS',
                })}
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
                data-testid={`zone-row-${item.name}`}
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
                    data-testid="zone-color-indicator"
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

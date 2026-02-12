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
import { formatDuration, isTestEnvironment } from '@/lib/utils'

// --- Types ---
interface ZoneDistributionProps {
  timeInZones: Record<HrZoneName, number>
  totalDuration: number
}

// --- Constants & Helpers ---

const ZONE_ORDER: HrZoneName[] = [
  HrZoneName.Max,
  HrZoneName.Peak,
  HrZoneName.Cardio,
  HrZoneName.FatBurn,
  HrZoneName.Aerobic,
  HrZoneName.WarmUp,
  HrZoneName.Recovery,
  HrZoneName.Idle,
  HrZoneName.NoData,
  HrZoneName.Unknown,
]

const ZONE_COLOR_KEY_MAP: Partial<
  Record<HrZoneName, keyof Palette['custom']['hrZones']>
> = {
  [HrZoneName.Max]: 'max',
  [HrZoneName.Peak]: 'peak',
  [HrZoneName.Cardio]: 'cardio',
  [HrZoneName.FatBurn]: 'fatBurn',
  [HrZoneName.WarmUp]: 'warmUp',
  [HrZoneName.Recovery]: 'recovery',
  [HrZoneName.Aerobic]: 'fatBurn', // Aerobic capacity is typically higher intensity (Zone 3/4 boundary), mapping to Green/FatBurn as fallback
  [HrZoneName.Idle]: 'idle',
}

const DURATION_FORMAT_OPTS = { unit: 'seconds', format: 'MM:SS' } as const

const ZoneDistribution: React.FC<ZoneDistributionProps> = ({
  timeInZones,
  totalDuration,
}) => {
  const theme = useTheme()

  const data = useMemo(() => {
    // We intentionally include NoData and Unknown to reflect the true integrity of the workout duration.
    // Excluding them would misleadingly show 100% adherence to active zones even if data was missing for 90% of the time.
    return Object.entries(timeInZones)
      .map(([zone, time]) => {
        const zoneName = zone as HrZoneName

        const color =
          theme.palette.custom?.hrZones?.[
            ZONE_COLOR_KEY_MAP[zoneName] || 'idle'
          ] ?? theme.palette.grey[500]

        return {
          name: zoneName,
          value: time,
          percentage:
            totalDuration > 0
              ? Math.round((time / totalDuration) * 1000) / 10
              : 0,
          formattedTime: formatDuration(time, DURATION_FORMAT_OPTS),
          color,
        }
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => {
        const idxA = ZONE_ORDER.indexOf(a.name)
        const idxB = ZONE_ORDER.indexOf(b.name)
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
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
              <PieChart accessibilityLayer>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={!isTestEnvironment()}
                >
                  {data.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number | undefined) => [
                    formatDuration(value ?? 0, DURATION_FORMAT_OPTS),
                    'Duration',
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: theme.shadows[3],
                  }}
                  isAnimationActive={!isTestEnvironment()}
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
                {formatDuration(totalDuration, DURATION_FORMAT_OPTS)}
              </Typography>
            </Box>
          </Box>

          {/* Legend / List Section */}
          <Box
            component="ul"
            width={{ xs: '100%', sm: '50%' }}
            display="flex"
            flexDirection="column"
            gap={1}
            p={0}
            m={0}
            sx={{ listStyle: 'none' }}
          >
            {data.map((item) => (
              <Box
                component="li"
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

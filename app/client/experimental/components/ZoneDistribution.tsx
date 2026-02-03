'use client'

import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  Stack,
  Theme,
} from '@mui/material'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { HrZoneName } from '@/lib/shared/hr-zones'
import { formatDuration } from '@/lib/utils'

// --- Types ---
interface ZoneDistributionProps {
  timeInZones: Record<HrZoneName, number>
  totalDuration: number
}

// --- Helpers ---

// Map your domain "HrZoneName" enum to the UI colors defined in the theme
const getZoneColor = (zone: string, theme: Theme): string => {
  const hrZones = theme.palette.custom?.hrZones
  if (!hrZones) return theme.palette.grey[500]

  switch (zone) {
    case HrZoneName.Max:
      return hrZones.max
    case HrZoneName.Peak:
      return hrZones.peak
    case HrZoneName.Cardio:
      return hrZones.cardio
    case HrZoneName.FatBurn:
      return hrZones.fatBurn
    case HrZoneName.WarmUp:
      return hrZones.warmUp
    case HrZoneName.NoData:
      return hrZones.noData
    case HrZoneName.Unknown:
      return hrZones.unknown
    default:
      return theme.palette.grey[500]
  }
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
            formattedTime: formatDuration(time, {
              unit: 'seconds',
              format: 'MM:SS',
            }),
            color: getZoneColor(zone, theme),
          }
        })
        // Sort by intensity usually makes sense, but data order might suffice.
        // Filter out zero values to keep the chart clean
        .filter((item) => item.value > 0)
    )
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
                    formatDuration(Number(value || 0), {
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

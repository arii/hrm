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
import { formatDuration } from '@/lib/utils'
import { getZoneColor } from '@/utils/themeUtils'

interface ZoneDistributionProps {
  timeInZones: Record<HrZoneName, number>
  totalDuration: number
}

// Order of zones for sorting (High intensity to Low intensity)
const ZONE_ORDER: HrZoneName[] = [
  HrZoneName.Max,
  HrZoneName.Peak,
  HrZoneName.Cardio,
  HrZoneName.FatBurn,
  HrZoneName.WarmUp,
  HrZoneName.NoData,
  HrZoneName.Unknown,
]

const ZoneDistribution: React.FC<ZoneDistributionProps> = ({
  timeInZones,
  totalDuration,
}) => {
  const theme = useTheme()

  const data = useMemo(() => {
    return Object.entries(timeInZones)
      .map(([zone, time]) => {
        const percentage = totalDuration > 0 ? (time / totalDuration) * 100 : 0
        return {
          name: zone as HrZoneName,
          value: time,
          percentage: parseFloat(percentage.toFixed(1)),
          formattedTime: formatDuration(time, {
            unit: 'seconds',
            format: 'MM:SS',
          }),
          color: getZoneColor(zone as HrZoneName, theme),
        }
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => {
        const indexA = ZONE_ORDER.indexOf(a.name)
        const indexB = ZONE_ORDER.indexOf(b.name)
        // If a zone is not in the order list, push it to the end
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
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
            role="region"
            aria-label="Heart rate zone distribution chart"
          >
            <ResponsiveContainer width="100%" height={200}>
              <PieChart accessibilityLayer>
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
                  formatter={(_value, _name, item) => [
                    item.payload.formattedTime,
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
        </Stack>
      </CardContent>
    </Card>
  )
}

export default ZoneDistribution

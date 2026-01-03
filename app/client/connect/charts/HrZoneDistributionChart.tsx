// app/client/connect/charts/HrZoneDistributionChart.tsx
import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Box, Typography } from '@mui/material'
import { ZoneData } from '@/hooks/useHeartRateHistory'
import { ZONE_COLORS } from '@/utils/visualization'

interface HrZoneDistributionChartProps {
  zoneDistribution: ZoneData
}

const HrZoneDistributionChart: React.FC<HrZoneDistributionChartProps> = ({
  zoneDistribution,
}) => {
  const chartData = Object.entries(zoneDistribution)
    .map(([zone, seconds]) => ({
      name: zone,
      value: seconds,
    }))
    .filter((d) => d.value > 0)

  if (chartData.length === 0) {
    return null
  }

  return (
    <Box sx={{ width: '100%', height: 300, mt: 4 }}>
      <Typography variant="h6" align="center" gutterBottom>
        HR Zone Distribution
      </Typography>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
          >
            {chartData.map((entry) => (
              <Cell
                key={`cell-${entry.name}`}
                fill={ZONE_COLORS[entry.name as keyof typeof ZONE_COLORS]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => {
              const minutes = Math.floor(value / 60)
              const seconds = Math.round(value % 60)
              return `${minutes}m ${seconds}s`
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  )
}

export default HrZoneDistributionChart

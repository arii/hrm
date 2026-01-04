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
    .map(([name, value]) => ({ name, value }))
    .filter((entry) => entry.value > 0)

  if (chartData.length === 0) {
    return null
  }

  const colors = Object.values(ZONE_COLORS)

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        HR Zone Distribution
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
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
            {chartData.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#333', border: 'none' }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: number) => [
              `${Math.round(value)} seconds`,
              'Time in Zone',
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  )
}

export default HrZoneDistributionChart

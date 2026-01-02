'use client'
import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTheme } from '@mui/material/styles'
import { formatDuration } from '@/utils/formatters'

interface RealTimeChartProps {
  data: { time: number; hr: number; calories: number }[]
}

const RealTimeChart: React.FC<RealTimeChartProps> = ({ data }) => {
  const theme = useTheme()

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        role="figure"
        aria-label="Real-time heart rate chart"
      >
        <XAxis
          dataKey="time"
          tickFormatter={(time) => formatDuration(time * 1000, 'm:ss')}
        />
        <YAxis />
        <Tooltip
          labelFormatter={(time) => `Time: ${formatDuration(time * 1000, 'm:ss')}`}
          formatter={(value: number, name: string) => [
            `${value} ${name === 'hr' ? 'bpm' : name}`,
            name,
          ]}
        />
        <Area
          type="monotone"
          dataKey="hr"
          stroke={theme.palette.primary.main}
          fill={theme.palette.primary.light}
        />
        <Area
          type="monotone"
          dataKey="calories"
          stroke={theme.palette.secondary.main}
          fill={theme.palette.secondary.light}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default RealTimeChart

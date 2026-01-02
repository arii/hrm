'use client'

import React, { memo } from 'react'
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import { Box, Typography, Paper } from '@mui/material'

interface RealTimeChartProps {
  data: { time: number; hr: number; calories: number }[]
}

const formatXAxis = (tickItem: number) => {
  const minutes = Math.floor(tickItem / 60)
  const seconds = tickItem % 60
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: number
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length && label) {
    return (
      <Paper sx={{ p: 1 }}>
        <Typography variant="body2">{`Time: ${formatXAxis(label)}`}</Typography>
        <Typography variant="body2" sx={{ color: '#8884d8' }}>{`HR: ${payload[0].value} bpm`}</Typography>
        <Typography
          variant="body2"
          sx={{ color: '#82ca9d' }}
        >{`Calories: ${payload[1].value.toFixed(0)}`}</Typography>
      </Paper>
    )
  }

  return null
}

const RealTimeChart: React.FC<RealTimeChartProps> = ({ data }) => {
  return (
    <Box sx={{ width: '100%', height: 300, mt: 4 }}>
      <Typography variant="h6" align="center" gutterBottom>
        Workout Analysis
      </Typography>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatXAxis}
          />
          <YAxis yAxisId="left" domain={[60, 200]} />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip content={<CustomTooltip />} />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="hr"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.6}
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="calories"
            stroke="#82ca9d"
            fill="#82ca9d"
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  )
}

export default memo(RealTimeChart)

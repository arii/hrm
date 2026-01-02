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
import { Box, Typography, Paper, useTheme } from '@mui/material'

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
    const hrPayload = payload[0]
    const caloriesPayload = payload[1]

    return (
      <Paper sx={{ p: 1 }}>
        <Typography variant="body2">{`Time: ${formatXAxis(label)}`}</Typography>
        {hrPayload && (
          <Typography
            variant="body2"
            sx={{ color: '#8884d8' }}
          >{`HR: ${hrPayload.value} bpm`}</Typography>
        )}
        {caloriesPayload && (
          <Typography
            variant="body2"
            sx={{ color: '#82ca9d' }}
          >{`Calories: ${caloriesPayload.value.toFixed(0)}`}</Typography>
        )}
      </Paper>
    )
  }

  return null
}

const RealTimeChart: React.FC<RealTimeChartProps> = ({ data }) => {
  const theme = useTheme()

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
            stroke={theme.palette.primary.main}
            fill={theme.palette.primary.main}
            fillOpacity={0.6}
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="calories"
            stroke={theme.palette.secondary.main}
            fill={theme.palette.secondary.main}
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  )
}

export default memo(RealTimeChart)

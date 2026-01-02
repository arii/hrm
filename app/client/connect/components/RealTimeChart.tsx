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
import { Theme } from '@mui/material/styles'

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
  payload?: { value: number; dataKey: string }[]
  label?: number
  theme: Theme
}

const CustomTooltip = ({
  active,
  payload,
  label,
  theme,
}: CustomTooltipProps) => {
  if (active && payload && payload.length && label) {
    const hrPayload = payload.find((p) => p.dataKey === 'hr')
    const caloriesPayload = payload.find((p) => p.dataKey === 'calories')

    return (
      <Paper sx={{ p: 1 }}>
        <Typography variant="body2">{`Time: ${formatXAxis(label)}`}</Typography>
        {hrPayload && (
          <Typography
            variant="body2"
            sx={{ color: theme.palette.primary.main }}
          >{`HR: ${hrPayload.value} bpm`}</Typography>
        )}
        {caloriesPayload && (
          <Typography
            variant="body2"
            sx={{ color: theme.palette.secondary.main }}
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
    <Box
      sx={{ width: '100%', height: 300, mt: 4 }}
      role="img"
      aria-label="Real-time chart of heart rate and calories burned"
    >
      <Typography variant="h6" align="center" gutterBottom id="chart-heading">
        Workout Analysis
      </Typography>
      <ResponsiveContainer>
        <AreaChart data={data} aria-labelledby="chart-heading">
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatXAxis}
          />
          <YAxis yAxisId="left" domain={['dataMin - 10', 'dataMax + 10']} />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={['dataMin - 50', 'dataMax + 50']}
          />
          <Tooltip content={<CustomTooltip theme={theme} />} />
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

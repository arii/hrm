'use client'

import React, { useMemo } from 'react'
import { useTheme } from '@mui/material/styles'
import { LineChart } from '@mui/x-charts/LineChart'
import { ChartsReferenceLine } from '@mui/x-charts/ChartsReferenceLine'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

interface DataPoint {
  timestamp: number
  bpm: number
}

interface HeartRateGradientChartProps {
  data: DataPoint[]
  height?: number
  maxHr?: number
}

export const HeartRateGradientChart = ({
  data,
  height = 350,
  maxHr = 190,
}: HeartRateGradientChartProps) => {
  const theme = useTheme()

  // Generate x-axis labels (Time)
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Calculate strict Y-axis domain to focus the chart on relevant activity
  const yDomain = useMemo(() => {
    if (data.length === 0) return { min: 40, max: 200 }
    const bpms = data.map((d) => d.bpm)
    return {
      min: Math.max(40, Math.min(...bpms) - 10),
      max: Math.min(220, Math.max(...bpms) + 10),
    }
  }, [data])

  // Gradient ID
  const gradientId = 'hr-zone-gradient'

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* SVG Definition for the Gradient */}
      <svg style={{ height: 0, width: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {/* Peak / Red Zone */}
            <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.8} />
            {/* Cardio / Orange Zone */}
            <stop offset="30%" stopColor={theme.palette.warning.main} stopOpacity={0.6} />
            {/* Fat Burn / Green Zone */}
            <stop offset="60%" stopColor={theme.palette.success.main} stopOpacity={0.4} />
            {/* Rest / Blue Zone */}
            <stop offset="95%" stopColor={theme.palette.info.main} stopOpacity={0.1} />
          </linearGradient>
        </defs>
      </svg>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="h2">
          Live Heart Rate
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {data.length > 0 ? `${data.length}s window` : 'Waiting for data...'}
        </Typography>
      </Box>

      <div style={{ width: '100%', height }}>
        <LineChart
          dataset={data}
          xAxis={[
            {
              dataKey: 'timestamp',
              valueFormatter: formatTime,
              scaleType: 'time',
              tickMinStep: 5000, // Min 5 seconds between ticks
              disableLine: true,
              disableTicks: false,
            },
          ]}
          yAxis={[
            {
              min: yDomain.min,
              max: yDomain.max,
              label: 'BPM',
              disableLine: true,
              disableTicks: true,
            },
          ]}
          series={[
            {
              dataKey: 'bpm',
              area: true,
              showMark: false,
              color: theme.palette.primary.main, // Fallback color
              curve: 'catmullRom', // Smooths the line
            },
          ]}
          grid={{ horizontal: true }}
          slotProps={{
            legend: { hidden: true },
          }}
          sx={{
            // Apply the gradient to the area
            '.MuiAreaElement-root': {
              fill: `url(#${gradientId})`,
            },
            // Style the line itself
            '.MuiLineElement-root': {
              stroke: theme.palette.text.primary,
              strokeWidth: 2,
              strokeOpacity: 0.5,
            },
          }}
        >
          {/* Visual Guide Reference Line for Max HR */}
          <ChartsReferenceLine
            y={maxHr}
            label="Max HR"
            lineStyle={{ stroke: theme.palette.error.main, strokeDasharray: '3 3' }}
            labelStyle={{ fill: theme.palette.error.main, fontSize: 10 }}
          />
        </LineChart>
      </div>
    </Box>
  )
}

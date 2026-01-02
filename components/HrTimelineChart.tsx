// File: components/HrTimelineChart.tsx
'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts'
import { Paper, Typography, useTheme } from '@mui/material'
import { useMemo } from 'react'
import { ZONE_COLORS } from '@/utils/visualization'

interface HrTimelineChartProps {
  data: {
    [clientId: string]: { value: number; timestamp: number }[]
  }
  maxHr: number
}

const lineColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe']

const HrTimelineChart = ({ data, maxHr }: HrTimelineChartProps) => {
  const theme = useTheme()
  const clientIds = Object.keys(data)

  const chartData = useMemo(() => {
    if (clientIds.length === 0) return []

    const allTimestamps = new Set<number>()
    clientIds.forEach((clientId) => {
      data[clientId].forEach((d) => allTimestamps.add(d.timestamp))
    })

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

    return sortedTimestamps.map((timestamp) => {
      const entry: { [key: string]: number | string } = {
        time: new Date(timestamp).toLocaleTimeString(),
      }
      clientIds.forEach((clientId) => {
        const point = data[clientId].find((d) => d.timestamp === timestamp)
        entry[clientId] = point ? point.value : 0
      })
      return entry
    })
  }, [data, clientIds])

  if (clientIds.length === 0) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          height: 300,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h6">Heart Rate Timeline</Typography>
        <Typography variant="body1">
          Waiting for heart rate data...
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper
      elevation={3}
      sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 300 }}
    >
      <Typography variant="h6">Heart Rate Timeline</Typography>
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid stroke={theme.palette.divider} />
          <XAxis dataKey="time" tick={{ fill: theme.palette.text.secondary }} />
          <YAxis domain={[0, maxHr]} tick={{ fill: theme.palette.text.secondary }} />
          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
            }}
          />
          <Legend wrapperStyle={{ color: theme.palette.text.primary }} />
          <ReferenceArea y1={0} y2={maxHr * 0.6} fill={ZONE_COLORS.blue} fillOpacity={0.2} label="Warm Up" />
          <ReferenceArea y1={maxHr * 0.6} y2={maxHr * 0.7} fill={ZONE_COLORS.green} fillOpacity={0.2} label="Fat Burn" />
          <ReferenceArea y1={maxHr * 0.7} y2={maxHr * 0.8} fill={ZONE_COLORS.yellow} fillOpacity={0.2} label="Cardio" />
          <ReferenceArea y1={maxHr * 0.8} y2={maxHr * 0.9} fill={ZONE_COLORS.red} fillOpacity={0.2} label="Peak" />
          <ReferenceArea y1={maxHr * 0.9} y2={maxHr} fill={ZONE_COLORS.purple} fillOpacity={0.2} label="Max" />
          {clientIds.map((clientId, index) => (
            <Line
              key={clientId}
              type="monotone"
              dataKey={clientId}
              stroke={lineColors[index % lineColors.length]}
              activeDot={{ r: 8 }}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  )
}

export default HrTimelineChart

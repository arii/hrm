// app/client/connect/charts/HrHistoryChart.tsx
import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Box, Typography } from '@mui/material'
import { HeartRateSample } from '@/hooks/useHeartRateHistory'
import { getHrZoneProps } from '@/utils/visualization'

interface HrHistoryChartProps {
  history: HeartRateSample[]
  maxHr: number
}

const HrHistoryChart: React.FC<HrHistoryChartProps> = ({ history, maxHr }) => {
  if (history.length === 0) {
    return null
  }

  // Limit to the last 60 seconds of data for relevance
  const sixtySecondsAgo = Date.now() - 60000
  const chartData = history.filter((sample) => sample.timestamp > sixtySecondsAgo)

  if (chartData.length < 2) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="subtitle1" color="text.secondary">
          Waiting for more heart rate data...
        </Typography>
      </Box>
    )
  }

  const zones = [
    { percent: 50, color: '#9E9E9E' },
    { percent: 60, color: '#2196F3' },
    { percent: 70, color: '#4CAF50' },
    { percent: 85, color: '#FFC107' },
    { percent: 95, color: '#F44336' },
  ]

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        HR History (Last 60s)
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
            stroke="#9E9E9E"
          />
          <YAxis
            domain={[60, Math.max(200, maxHr)]}
            stroke="#9E9E9E"
            label={{
              value: 'BPM',
              angle: -90,
              position: 'insideLeft',
              fill: '#9E9E9E',
            }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#333', border: 'none' }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: number, name, props) => {
              const { zone } = getHrZoneProps(props.payload.hr, maxHr)
              return [`${value} BPM`, `Zone: ${zone}`]
            }}
          />
          <Line
            type="monotone"
            dataKey="hr"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
          />
          {zones.map((zone) => (
            <ReferenceLine
              key={zone.percent}
              y={(maxHr * zone.percent) / 100}
              stroke={zone.color}
              strokeDasharray="3 3"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}

export default HrHistoryChart

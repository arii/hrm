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

  const chartData = history.map((sample) => ({
    time: new Date(sample.timestamp).toLocaleTimeString(),
    hr: sample.hr,
  }))

  const zones = [
    { percent: 0.5, label: 'Zone 1' },
    { percent: 0.6, label: 'Zone 2' },
    { percent: 0.7, label: 'Zone 3' },
    { percent: 0.8, label: 'Zone 4' },
    { percent: 0.9, label: 'Zone 5' },
  ]

  return (
    <Box sx={{ width: '100%', height: 300, mt: 4 }}>
      <Typography variant="h6" align="center" gutterBottom>
        HR Trend
      </Typography>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <XAxis dataKey="time" hide />
          <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
          <Tooltip />
          {zones.map((zone) => {
            const zoneBpm = maxHr * zone.percent
            const { progressColor } = getHrZoneProps(zoneBpm, maxHr)
            return (
              <ReferenceLine
                key={zone.label}
                y={zoneBpm}
                label={{ value: zone.label, position: 'insideTopLeft' }}
                stroke={progressColor}
                strokeDasharray="3 3"
              />
            )
          })}
          <Line
            type="monotone"
            dataKey="hr"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}

export default HrHistoryChart

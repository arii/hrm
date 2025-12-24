// app/client/connect/HrHistoryChart.tsx
'use client'
import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { HrDataPoint } from '@/hooks/useBluetoothHRM'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

interface HrHistoryChartProps {
  data: HrDataPoint[]
}

const HrHistoryChart: React.FC<HrHistoryChartProps> = ({ data }) => {
  if (data.length === 0) {
    return null
  }

  const chartData = data.map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString(),
    hr: d.hr,
  }))

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Heart Rate History
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="hr"
            stroke="#8884d8"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  )
}

export default HrHistoryChart

// components/analytics/HeartRateTimeSeries.tsx
'use client'
import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Paper, Typography, useTheme } from '@mui/material'
import { WorkoutDataPoint } from '@/hooks/useLocalWorkoutBuffer'

interface HeartRateTimeSeriesProps {
  data: WorkoutDataPoint[]
}

const HeartRateTimeSeries: React.FC<HeartRateTimeSeriesProps> = ({ data }) => {
  const theme = useTheme()

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Heart Rate Over Time
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tickFormatter={(time) => new Date(time).toLocaleTimeString()}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="hr"
            stroke={theme.palette.primary.main}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  )
}

export default HeartRateTimeSeries

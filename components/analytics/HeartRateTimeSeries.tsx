// components/analytics/HeartRateTimeSeries.tsx
'use client'
import React from 'react'
import { LineChart, Line, XAxis, YAxis } from 'recharts'
import { Paper, Typography } from '@mui/material'

const HeartRateTimeSeries: React.FC = () => {
  const data = [
    { time: 1, hr: 120 },
    { time: 2, hr: 125 },
    { time: 3, hr: 130 },
  ]

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Heart Rate Over Time
      </Typography>
      <LineChart width={500} height={300} data={data}>
        <XAxis dataKey="time" />
        <YAxis />
        <Line type="monotone" dataKey="hr" stroke="#8884d8" />
      </LineChart>
    </Paper>
  )
}

export default HeartRateTimeSeries

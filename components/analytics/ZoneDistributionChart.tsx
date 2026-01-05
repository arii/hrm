// components/analytics/ZoneDistributionChart.tsx
'use client'
import React from 'react'
import { BarChart, Bar, XAxis, YAxis } from 'recharts'
import { Paper, Typography } from '@mui/material'

const ZoneDistributionChart: React.FC = () => {
  const data = [
    { name: 'Zone 1', time: 10 },
    { name: 'Zone 2', time: 20 },
    { name: 'Zone 3', time: 30 },
  ]

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Time in Heart Rate Zones
      </Typography>
      <BarChart width={500} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Bar dataKey="time" fill="#8884d8" />
      </BarChart>
    </Paper>
  )
}

export default ZoneDistributionChart

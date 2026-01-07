// app/client/experimental/components/WorkoutSummary.tsx
import React from 'react'
import { Card, CardContent, Typography, Box } from '@mui/material'

interface WorkoutSummaryProps {
  duration: number
  calories: number
  status: 'idle' | 'running' | 'paused' | 'finished'
}

const WorkoutSummary = ({
  duration,
  calories,
  status,
}: WorkoutSummaryProps) => {
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, '0')
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Workout Summary
        </Typography>
        <Box display="flex" flexWrap="wrap" mx={-1}>
          <Box width="50%" p={1}>
            <Typography variant="h6">Status</Typography>
            <Typography variant="body1">{status}</Typography>
          </Box>
          <Box width="50%" p={1}>
            <Typography variant="h6">Duration</Typography>
            <Typography variant="body1">{formatDuration(duration)}</Typography>
          </Box>
          <Box width="50%" p={1}>
            <Typography variant="h6">Calories Burned</Typography>
            <Typography variant="body1">{calories.toFixed(2)}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default WorkoutSummary

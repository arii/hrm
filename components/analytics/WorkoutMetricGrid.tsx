// components/analytics/WorkoutMetricGrid.tsx
'use client'
import React from 'react'
import { Card, CardContent, Typography, Box } from '@mui/material'
import { formatDuration } from '@/lib/utils'

interface WorkoutMetricGridProps {
  workoutDuration: number
  caloriesBurned: number
}

const WorkoutMetricGrid: React.FC<WorkoutMetricGridProps> = ({
  workoutDuration,
  caloriesBurned,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      <Card sx={{ flex: 1 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Total Duration
          </Typography>
          <Typography variant="h4">
            {formatDuration(workoutDuration)}
          </Typography>
        </CardContent>
      </Card>
      <Card sx={{ flex: 1 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Calories Burned
          </Typography>
          <Typography variant="h4">{caloriesBurned.toFixed(0)}</Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default WorkoutMetricGrid

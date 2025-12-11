// components/WorkoutSummary.tsx
'use client'

import { useWorkout } from '@/context/WorkoutContext'
import { formatDuration } from '@/utils/time'
import { Paper, Typography } from '@mui/material'

const WorkoutSummary = () => {
  const { workoutState } = useWorkout()
  const { isWorkoutActive, duration, startTime } = workoutState

  if (!isWorkoutActive && !startTime) {
    return null
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        mt: 2,
        backgroundColor: isWorkoutActive ? 'primary.dark' : 'grey.800',
        color: 'white',
        textAlign: 'center',
      }}
    >
      <Typography variant="h6">
        {isWorkoutActive ? 'Workout in Progress' : 'Workout Finished'}
      </Typography>
      <Typography variant="h4">{formatDuration(duration)}</Typography>
    </Paper>
  )
}

export default WorkoutSummary

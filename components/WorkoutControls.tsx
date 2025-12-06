'use client'

import React from 'react'
import { Button, Stack } from '@mui/material'

interface WorkoutControlsProps {
  onStart: () => void
  onStop: () => void
  isWorkoutActive: boolean
}

const WorkoutControls: React.FC<WorkoutControlsProps> = ({
  onStart,
  onStop,
  isWorkoutActive,
}) => {
  return (
    <Stack direction="row" spacing={2}>
      <Button
        variant="contained"
        color="primary"
        onClick={onStart}
        disabled={isWorkoutActive}
      >
        Start Workout
      </Button>
      <Button
        variant="contained"
        color="secondary"
        onClick={onStop}
        disabled={!isWorkoutActive}
      >
        Stop Workout
      </Button>
    </Stack>
  )
}

export default WorkoutControls

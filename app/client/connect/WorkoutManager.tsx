// app/client/connect/WorkoutManager.tsx
'use client'

import React from 'react'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import WorkoutSummary from './WorkoutSummary'
import HrTile from '../../../components/HrTile'

interface WorkoutManagerProps {
  workoutStatus: 'idle' | 'running' | 'paused'
  onStartWorkout: () => void
  onEndWorkout: () => void
  isConnected: boolean
  hasStarted: boolean
  duration: string
  caloriesBurned: number
  userName: string
  currentHR: number
  hrZoneProps: { percentage: number; progressColor: string }
}

const WorkoutManager: React.FC<WorkoutManagerProps> = ({
  workoutStatus,
  onStartWorkout,
  onEndWorkout,
  isConnected,
  hasStarted,
  duration,
  caloriesBurned,
  userName,
  currentHR,
  hrZoneProps,
}) => {
  return (
    <>
      {isConnected && currentHR > 0 && (
        <HrTile
          name={userName}
          bpm={currentHR}
          percentMax={hrZoneProps.percentage}
          isAlerting={false}
        />
      )}
      <Stack
        spacing={2}
        sx={{
          mt: 3,
          mb: 3,
          alignItems: 'center',
          minHeight: '48px', // Ensure consistent height for layout stability
        }}
      >
        {workoutStatus === 'idle' && isConnected && (
          <Button
            variant="contained"
            onClick={onStartWorkout}
            size="large"
            sx={{ minWidth: '200px' }}
            aria-label="Start workout session"
          >
            Start Workout
          </Button>
        )}
        {workoutStatus === 'paused' && (
          <>
            <Button
              variant="contained"
              onClick={onStartWorkout}
              size="large"
              sx={{ minWidth: '200px' }}
              disabled={!isConnected}
              aria-label="Resume workout session"
            >
              Resume Workout
            </Button>
            <Button
              variant="outlined"
              onClick={onEndWorkout}
              size="large"
              sx={{ minWidth: '200px' }}
              aria-label="End workout session"
            >
              End Workout
            </Button>
          </>
        )}
        {workoutStatus === 'running' && (
          <Button
            variant="outlined"
            onClick={onEndWorkout}
            size="large"
            sx={{ minWidth: '200px' }}
            aria-label="End workout session"
          >
            End Workout
          </Button>
        )}
      </Stack>

      {hasStarted && (
        <WorkoutSummary duration={duration} caloriesBurned={caloriesBurned} />
      )}
    </>
  )
}

export default WorkoutManager

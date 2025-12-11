// app/client/control/components/WorkoutControls.tsx
'use client'

import { useWorkout } from '@/context/WorkoutContext'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { formatDuration } from '@/utils/time'

const WorkoutControls = () => {
  const { workoutState, startWorkout, endWorkout } = useWorkout()
  const { isWorkoutActive, duration } = workoutState

  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: 'grey.900',
        borderRadius: 2,
        textAlign: 'center',
      }}
    >
      <Typography variant="h6" gutterBottom>
        Workout Session
      </Typography>
      {isWorkoutActive ? (
        <>
          <Typography variant="h4" sx={{ mb: 2 }}>
            {formatDuration(duration)}
          </Typography>
          <Button
            variant="contained"
            color="error"
            onClick={endWorkout}
            fullWidth
          >
            End Workout
          </Button>
        </>
      ) : (
        <Button
          variant="contained"
          color="success"
          onClick={startWorkout}
          fullWidth
        >
          Start Workout
        </Button>
      )}
    </Box>
  )
}

export default WorkoutControls

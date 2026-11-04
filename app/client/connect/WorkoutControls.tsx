import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

import { WorkoutStatus } from '../../../types/workout'

interface WorkoutControlsProps {
  workoutStatus: WorkoutStatus
  isConnected: boolean
  onStart: () => void
  onPause: () => void
  onEnd: () => void
  onResume: () => void
}

const WorkoutControls = ({
  workoutStatus,
  isConnected,
  onStart,
  onPause,
  onEnd,
  onResume,
}: WorkoutControlsProps) => {
  return (
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
          onClick={onStart}
          size="large"
          sx={{ minWidth: '200px' }}
          aria-label="Start workout session"
        >
          Start Workout
        </Button>
      )}
      {workoutStatus === 'paused' && (
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            onClick={onResume}
            size="large"
            disabled={!isConnected}
            aria-label="Resume workout session"
          >
            Resume Workout
          </Button>
          <Button
            variant="outlined"
            onClick={onEnd}
            size="large"
            aria-label="End workout session"
          >
            End Workout
          </Button>
        </Stack>
      )}
      {workoutStatus === 'running' && (
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            onClick={onPause}
            size="large"
            aria-label="Pause workout session"
          >
            Pause Workout
          </Button>
          <Button
            variant="outlined"
            onClick={onEnd}
            size="large"
            aria-label="End workout session"
          >
            End Workout
          </Button>
        </Stack>
      )}
    </Stack>
  )
}

export default WorkoutControls

// File: components/WorkoutControls.tsx
'use client'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import DashboardWidget from './widgets/DashboardWidget'
import { useWebSocket } from '@/context/WebSocketContext'

const WorkoutControls = () => {
  const { sendWorkoutCommand } = useWebSocket()

  const handleStart = () => {
    sendWorkoutCommand('START')
  }

  const handleStop = () => {
    sendWorkoutCommand('STOP')
  }

  return (
    <DashboardWidget title="Workout Controls">
      <Stack direction="row" spacing={2}>
        <Button variant="contained" color="primary" onClick={handleStart}>
          Start Workout
        </Button>
        <Button variant="contained" color="secondary" onClick={handleStop}>
          Stop Workout
        </Button>
      </Stack>
    </DashboardWidget>
  )
}

export default WorkoutControls

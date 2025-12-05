// File: components/WorkoutControls.tsx
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

const WorkoutControls = () => {
  const { sendData } = useWebSocket()

  const handleStart = () => {
    sendData({ type: 'TIMER_COMMAND', command: 'START' })
  }

  const handleStop = () => {
    sendData({ type: 'TIMER_COMMAND', command: 'STOP' })
  }

  return (
    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={handleStart}
      >
        Start Workout
      </Button>
      <Button
        variant="contained"
        color="secondary"
        size="large"
        onClick={handleStop}
      >
        Stop Workout
      </Button>
    </Stack>
  )
}

export default WorkoutControls

// File: components/WorkoutControls.tsx
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { Button, Stack } from '@mui/material'

const WorkoutControls = () => {
  const { sendData } = useWebSocket()

  const handleStart = () => {
    if (sendData) {
      sendData({ type: 'TIMER_COMMAND', payload: { command: 'START' } })
    }
  }

  const handleStop = () => {
    if (sendData) {
      sendData({ type: 'TIMER_COMMAND', payload: { command: 'STOP' } })
    }
  }

  return (
    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
      <Button variant="contained" color="primary" onClick={handleStart}>
        Start Workout
      </Button>
      <Button variant="contained" color="secondary" onClick={handleStop}>
        Stop Workout
      </Button>
    </Stack>
  )
}

export default WorkoutControls

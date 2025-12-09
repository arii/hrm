// components/WorkoutControls.tsx
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { Button, Card, CardContent, Stack, Typography } from '@mui/material'

const WorkoutControls = () => {
  const { send, timerData } = useWebSocket()
  const { isRunning, mode } = timerData

  const handleStart = () => {
    send({ type: 'TIMER_COMMAND', payload: { command: 'START' } })
  }

  const handleStop = () => {
    send({ type: 'TIMER_COMMAND', payload: { command: 'STOP' } })
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Workout Controls
        </Typography>
        <Stack spacing={2} direction="row">
          <Button
            variant="contained"
            color="primary"
            onClick={handleStart}
            disabled={isRunning}
          >
            Start
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleStop}
            disabled={!isRunning}
          >
            Stop
          </Button>
        </Stack>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Status: {isRunning ? `Running (${mode})` : 'Stopped'}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default WorkoutControls

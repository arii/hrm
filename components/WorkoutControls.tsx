// File: components/WorkoutControls.tsx
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import {
  TimerCommandMessage,
} from '@/types/websocket'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Stop from '@mui/icons-material/Stop'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'

const actionButtonSx = {
  flex: 1,
  fontWeight: 'bold',
  py: 1.5,
  minHeight: '64px',
  transition: 'transform 0.1s ease-in-out',
  '&:active': {
    transform: 'scale(0.95)',
  },
}

const WorkoutControls = () => {
  const { timerData, sendData, isConnected } = useWebSocket()
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerData.isRunning) {
      // Initialize elapsedTime based on the data from WebSocket
      setElapsedTime(timerData.timeElapsed)
      interval = setInterval(() => {
        setElapsedTime((prevTime) => prevTime + 1)
      }, 1000)
    } else {
      setElapsedTime(0)
    }
    return () => clearInterval(interval)
  }, [timerData.isRunning, timerData.timeElapsed])

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
      2,
      '0'
    )}`
  }

  const sendTimerCommand = useCallback(
    (command: 'START' | 'STOP') => {
      const message: TimerCommandMessage = { type: 'TIMER_COMMAND', command }
      sendData(message)
    },
    [sendData]
  )

  return (
    <Card
      sx={{
        boxShadow: 3,
        mb: 2,
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">
              Workout Timer
            </Typography>
            <Typography variant="h4" color="text.primary" sx={{ fontFamily: 'monospace' }}>
              {formatTime(elapsedTime)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            {!timerData.isRunning ? (
              <Button
                variant="contained"
                color="success"
                onClick={() => sendTimerCommand('START')}
                sx={actionButtonSx}
                startIcon={<PlayArrow />}
                disabled={!isConnected}
              >
                Start Workout
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                onClick={() => sendTimerCommand('STOP')}
                sx={actionButtonSx}
                startIcon={<Stop />}
                disabled={!isConnected}
              >
                Stop Workout
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default WorkoutControls

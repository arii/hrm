// File: components/WorkoutControls.tsx
'use client'

import { useWebSocket } from '@/context/WebSocketContext'
import { Card, CardContent, IconButton, Typography, Box } from '@mui/material'
import { PlayArrow, Stop } from '@mui/icons-material'
import { memo } from 'react'
import { TimerCommandMessage } from '@/types/websocket'

const WorkoutControls = () => {
  const { sendData, timerData } = useWebSocket()
  const { isRunning, timeRemaining, timeElapsed, mode } = timerData

  const handleStart = () => {
    const command: TimerCommandMessage = {
      type: 'TIMER_COMMAND',
      command: 'START',
    }
    sendData(command)
  }

  const handleStop = () => {
    const command: TimerCommandMessage = {
      type: 'TIMER_COMMAND',
      command: 'STOP',
    }
    sendData(command)
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  const displayTime = () => {
    const timeToDisplay = mode === 'STOPWATCH' ? timeElapsed : timeRemaining
    const mm = Math.floor(timeToDisplay / 60)
    const ss = timeToDisplay % 60
    return `${pad(mm)}:${pad(ss)}`
  }

  return (
    <Card
      elevation={6}
      sx={{
        backgroundColor: '#1a1a1a', // Dark theme
        color: '#ffffff',
        height: '100%',
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: { xs: 1, md: 2 },
          '&:last-child': { pb: { xs: 1, md: 2 } }, // Override MUI padding
        }}
      >
        <Typography
          variant="h5"
          component="div"
          sx={{
            fontFamily: 'var(--font-roboto-mono), monospace',
            fontWeight: 700,
            flexGrow: 1,
            textAlign: 'center',
            fontSize: { xs: '2.5rem', sm: '3rem' },
          }}
        >
          {displayTime()}
        </Typography>
        <Box>
          <IconButton
            onClick={handleStart}
            disabled={isRunning}
            aria-label="Start Workout"
            sx={{
              color: '#22C55E', // Green
              '&:disabled': {
                color: '#4B5563', // Gray
              },
              '&:hover': {
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
              },
            }}
          >
            <PlayArrow sx={{ fontSize: { xs: 40, sm: 50 } }} />
          </IconButton>
          <IconButton
            onClick={handleStop}
            disabled={!isRunning}
            aria-label="Stop Workout"
            sx={{
              color: '#EF4444', // Red
              '&:disabled': {
                color: '#4B5563', // Gray
              },
              '&:hover': {
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
              },
            }}
          >
            <Stop sx={{ fontSize: { xs: 40, sm: 50 } }} />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  )
}

export default memo(WorkoutControls)

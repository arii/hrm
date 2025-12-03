// File: components/WorkoutControls.tsx
'use client'

import { useWebSocket } from '@/context/WebSocketContext'
import { Card, CardContent, IconButton, Stack } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import { memo } from 'react'

const WorkoutControls = () => {
  const { sendData } = useWebSocket()

  const handleStart = () => {
    if (sendData) {
      sendData({
        type: 'TIMER_COMMAND',
        command: 'START',
      })
    }
  }

  const handleStop = () => {
    if (sendData) {
      sendData({
        type: 'TIMER_COMMAND',
        command: 'STOP',
      })
    }
  }

  return (
    <Card
      elevation={6}
      sx={{
        backgroundColor: '#1a1a1a',
        borderRadius: 2,
        height: '100%',
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          p: { xs: 2, md: 3 },
        }}
      >
        <Stack direction="row" spacing={2}>
          <IconButton
            aria-label="start workout"
            onClick={handleStart}
            sx={{
              backgroundColor: 'success.main',
              color: 'white',
              '&:hover': { backgroundColor: 'success.dark' },
            }}
          >
            <PlayArrowIcon fontSize="large" />
          </IconButton>
          <IconButton
            aria-label="stop workout"
            onClick={handleStop}
            sx={{
              backgroundColor: 'error.main',
              color: 'white',
              '&:hover': { backgroundColor: 'error.dark' },
            }}
          >
            <StopIcon fontSize="large" />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default memo(WorkoutControls)

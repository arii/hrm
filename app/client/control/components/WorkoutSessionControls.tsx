// File: app/client/control/components/WorkoutSessionControls.tsx
'use client'
import React from 'react'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Stop from '@mui/icons-material/Stop'
import Pause from '@mui/icons-material/Pause'
import { Box } from '@mui/material'

type WorkoutSessionControlsProps = {
  isSessionActive: boolean
  isPaused: boolean
  onStartSession: () => void
  onPauseSession: () => void
  onResumeSession: () => void
  onEndSession: () => void
  connectionStatus: string
}

const actionButtonBaseSx = {
  flex: 1,
  fontWeight: 'bold',
  py: 1.5,
  minHeight: '48px',
  transition:
    'transform 0.1s ease-in-out, box-shadow 0.2s ease, background-color 0.2s ease',
  '&:active': {
    transform: 'scale(0.95)',
  },
  color: 'white',
  borderRadius: 1,
  display: 'flex',
  alignItems: 'center',
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'info.main',
    outlineOffset: 2,
  },
  justifyContent: 'center',
  gap: 1,
}

const startButtonSx = {
  ...actionButtonBaseSx,
  background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
  boxShadow: 3,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: 4,
  },
  '&:disabled': {
    background: '#34495E',
    color: '#7F8C8D',
    boxShadow: 'none',
  },
}

const pauseButtonSx = {
  ...actionButtonBaseSx,
  background: 'linear-gradient(135deg, #F39C12 0%, #E67E22 100%)',
  boxShadow: 3,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: 4,
  },
}

const stopButtonSx = {
  ...actionButtonBaseSx,
  background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
  boxShadow: 3,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: 4,
  },
}

const WorkoutSessionControls: React.FC<WorkoutSessionControlsProps> = ({
  isSessionActive,
  isPaused,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onEndSession,
  connectionStatus,
}) => {
  const isConnected = connectionStatus === 'Connected'

  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" spacing={2} justifyContent="center">
        {!isSessionActive ? (
          <Button
            data-testid="start-session-button"
            variant="contained"
            onClick={onStartSession}
            disabled={!isConnected}
            sx={startButtonSx}
            startIcon={<PlayArrow />}
            aria-label="Start workout session"
          >
            Start
          </Button>
        ) : (
          <>
            <Button
              data-testid="pause-resume-button"
              variant="contained"
              onClick={isPaused ? onResumeSession : onPauseSession}
              disabled={!isConnected}
              sx={pauseButtonSx}
              startIcon={isPaused ? <PlayArrow /> : <Pause />}
              aria-label={
                isPaused ? 'Resume workout session' : 'Pause workout session'
              }
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              data-testid="end-session-button"
              variant="contained"
              onClick={onEndSession}
              disabled={!isConnected}
              sx={stopButtonSx}
              startIcon={<Stop />}
              aria-label="End workout session"
            >
              End
            </Button>
          </>
        )}
      </Stack>
    </Box>
  )
}

export default WorkoutSessionControls

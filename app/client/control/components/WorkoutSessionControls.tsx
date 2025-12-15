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

import { Theme, useTheme } from '@mui/material/styles'

const startButtonSx = (theme: Theme) => ({
  ...actionButtonBaseSx,
  background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
  boxShadow: 3,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: 4,
  },
  '&:disabled': {
    background: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
    boxShadow: 'none',
  },
})

const pauseButtonSx = (theme: Theme) => ({
  ...actionButtonBaseSx,
  background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
  boxShadow: 3,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: 4,
  },
})

const stopButtonSx = (theme: Theme) => ({
  ...actionButtonBaseSx,
  background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
  boxShadow: 3,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: 4,
  },
})

const WorkoutSessionControls: React.FC<WorkoutSessionControlsProps> = ({
  isSessionActive,
  isPaused,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onEndSession,
  connectionStatus,
}) => {
  const theme = useTheme()
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
            sx={startButtonSx(theme)}
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
              sx={pauseButtonSx(theme)}
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
              sx={stopButtonSx(theme)}
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

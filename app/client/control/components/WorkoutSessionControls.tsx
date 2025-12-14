// File: app/client/control/components/WorkoutSessionControls.tsx
'use client'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Stop from '@mui/icons-material/Stop'
import Pause from '@mui/icons-material/Pause'
import Resume from '@mui/icons-material/PlayArrow'

const actionButtonBaseSx = {
  flex: 1,
  fontWeight: 'bold',
  py: 1,
  minHeight: '48px',
  transition: 'transform 0.1s ease-in-out',
  '&:active': {
    transform: 'scale(0.95)',
  },
}

const startButtonSx = {
  ...actionButtonBaseSx,
  background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 32px rgba(16, 185, 129, 0.5)',
  },
}

const stopButtonSx = {
  ...actionButtonBaseSx,
  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 32px rgba(239, 68, 68, 0.5)',
  },
}

const pauseButtonSx = {
    ...actionButtonBaseSx,
    background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    boxShadow: '0 8px 24px rgba(249, 115, 22, 0.4)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 12px 32px rgba(249, 115, 22, 0.5)',
    },
  }

interface WorkoutSessionControlsProps {
  isSessionActive: boolean
  isPaused: boolean
  onStartSession: () => void
  onPauseSession: () => void
  onResumeSession: () => void
  onEndSession: () => void
  isConnected: boolean
}

const WorkoutSessionControls = ({
  isSessionActive,
  isPaused,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onEndSession,
  isConnected,
}: WorkoutSessionControlsProps) => {
  return (
    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
      {!isSessionActive ? (
        <Button
          data-testid="start-session-button"
          variant="contained"
          color="success"
          onClick={onStartSession}
          disabled={!isConnected}
          sx={startButtonSx}
          startIcon={<PlayArrow fontSize="large" />}
          aria-label="Start workout session"
        >
          START
        </Button>
      ) : (
        <>
          {isPaused ? (
            <Button
              data-testid="resume-session-button"
              variant="contained"
              color="success"
              onClick={onResumeSession}
              disabled={!isConnected}
              sx={startButtonSx}
              startIcon={<Resume fontSize="large" />}
              aria-label="Resume workout session"
            >
              RESUME
            </Button>
          ) : (
            <Button
              data-testid="pause-session-button"
              variant="contained"
              color="warning"
              onClick={onPauseSession}
              disabled={!isConnected}
              sx={pauseButtonSx}
              startIcon={<Pause fontSize="large" />}
              aria-label="Pause workout session"
            >
              PAUSE
            </Button>
          )}
          <Button
            data-testid="end-session-button"
            variant="contained"
            color="error"
            onClick={onEndSession}
            disabled={!isConnected}
            sx={stopButtonSx}
            startIcon={<Stop fontSize="large" />}
            aria-label="End workout session"
          >
            END
          </Button>
        </>
      )}
    </Stack>
  )
}

export default WorkoutSessionControls

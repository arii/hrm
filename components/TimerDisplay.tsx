// File: components/TimerDisplay.tsx
'use client'
import { Box, Card, CardContent, Typography } from '@mui/material'
import { TimerMode, TimerPhase } from '../types/websocket'

export interface TimerDisplayProps {
  phase: TimerPhase
  timeRemaining: number
  timeElapsed: number
  cycle: number
  totalCycles: number
  mode: TimerMode
  workDuration?: number
  restDuration?: number
}

const pad = (n: number) => String(n).padStart(2, '0')

const TimerDisplay = ({
  phase,
  timeRemaining,
  timeElapsed,
  cycle,
  totalCycles,
  mode,
}: TimerDisplayProps) => {
  let displayTime: string
  let phaseColor: string
  let phaseLabel: string

  if (phase === 'PREPARE') {
    displayTime = String(timeRemaining).padStart(2, '0')
    phaseColor = '#F59E0B' // Amber-500 (Warning)
    phaseLabel = 'GET READY'
  } else if (mode === 'STOPWATCH' && phase === 'RUNNING') {
    const mm = Math.floor(timeElapsed / 60)
    const ss = timeElapsed % 60
    displayTime = `${pad(mm)}:${pad(ss)}`
    // Improved contrast for black background (was #2563EB)
    phaseColor = '#60A5FA' // Blue-400
    phaseLabel = 'RUNNING'
  } else if (
    mode === 'TABATA' &&
    (phase === 'WORK' || phase === 'REST' || phase === 'COOLDOWN')
  ) {
    const mm = Math.floor(timeRemaining / 60)
    const ss = timeRemaining % 60
    displayTime = `${pad(mm)}:${pad(ss)}`

    if (phase === 'WORK') {
      phaseColor = '#EF4444' // Red-500
      phaseLabel = 'WORK'
    } else if (phase === 'REST') {
      phaseColor = '#22C55E' // Green-500
      phaseLabel = 'REST'
    } else {
      phaseColor = '#3B82F6' // Blue-500
      phaseLabel = 'COOLDOWN'
    }
  } else {
    displayTime = '00:00'
    phaseColor = '#9CA3AF' // Gray-400 (Improved contrast from #6B7280)
    phaseLabel = 'READY'
  }

  return (
    <Card
      elevation={6}
      component="section"
      aria-label={`${mode} Timer: ${phaseLabel}`}
      sx={{
        backgroundColor: '#000000',
        color: phaseColor,
        height: '100%',
        display: 'flex',
        borderRadius: 2,
        border: '2px solid #1a1a1a',
        position: 'relative',
        transition: 'border-color 0.3s ease',
        '&:hover': {
          borderColor: phaseColor,
        }
      }}
    >
      {/* Mode Indicator */}
      {phase !== 'IDLE' && (
        <Box
          sx={{
            position: 'absolute',
            left: { xs: 8, sm: 16 },
            top: '50%',
            transform: 'translateY(-50%) rotate(-90deg)',
            transformOrigin: 'center',
            zIndex: 1,
            display: { xs: 'none', sm: 'block' } // Hide on very small screens
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 700,
              letterSpacing: 2,
              fontSize: '0.75rem',
              backgroundColor: 'rgba(255,255,255,0.1)',
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            {mode}
          </Typography>
        </Box>
      )}

      <CardContent
        sx={{
          p: { xs: 2, md: 3 },
          textAlign: 'center',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {phase !== 'IDLE' && phase !== 'RUNNING' && (
          <Typography
            variant="h6"
            sx={{
              mb: 1,
              color: phaseColor,
              fontWeight: 700,
              letterSpacing: 3,
            }}
            data-testid="timer-phase"
          >
            {phaseLabel}
          </Typography>
        )}

        {/* Responsive Timer Display */}
        <Typography
          component="div"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          sx={{
            fontFamily: 'var(--font-roboto-mono), monospace',
            // Fluid typography: 6rem min, 15vw preferred, 10rem max
            fontSize: 'clamp(6rem, 15vw, 10rem)',
            fontWeight: 800,
            letterSpacing: '0.05em',
            lineHeight: 1,
            color: phaseColor,
            textShadow: `0 0 30px ${phaseColor}66`, // Softer glow
          }}
          data-testid="timer-countdown"
        >
          {displayTime}
        </Typography>

        {mode === 'TABATA' && cycle > 0 && (
          <Typography
            variant="h5"
            aria-label={`Cycle ${cycle} of ${totalCycles}`}
            sx={{
              mt: 2,
              color: '#9CA3AF',
              fontWeight: 600,
              fontSize: { xs: '1.25rem', md: '1.5rem' }
            }}
          >
            Cycle {cycle} / {totalCycles}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default TimerDisplay
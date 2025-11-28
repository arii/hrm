// File: components/TimerDisplay.tsx
'use client'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import { TimerMode, TimerPhase } from '../types/websocket'

export interface TimerDisplayProps {
  phase: TimerPhase
  timeRemaining: number // seconds (for countdown)
  timeElapsed: number // seconds (for stopwatch)
  mode: TimerMode
  workDuration?: number
  restDuration?: number
}

const pad = (n: number) => String(n).padStart(2, '0')

const TimerDisplay = ({
  phase,
  timeRemaining,
  timeElapsed,
  mode,
  workDuration = 20,
  restDuration = 10,
}: TimerDisplayProps) => {
  // Determine what to display based on mode and phase
  let displayTime: string
  let phaseColor: string
  let phaseLabel: string

  if (phase === 'PREPARE') {
    // PREPARE: Show countdown seconds only
    displayTime = String(timeRemaining).padStart(2, '0')
    phaseColor = '#F59E0B' // Yellow/Warning
    phaseLabel = 'GET READY'
  } else if (mode === 'STOPWATCH' && phase === 'RUNNING') {
    // STOPWATCH: Show elapsed time MM:SS
    const mm = Math.floor(timeElapsed / 60)
    const ss = timeElapsed % 60
    displayTime = `${pad(mm)}:${pad(ss)}`
    phaseColor = '#2563EB' // Blue/Primary
    phaseLabel = 'RUNNING'
  } else if (
    mode === 'TABATA' &&
    (phase === 'WORK' || phase === 'REST' || phase === 'COOLDOWN')
  ) {
    // TABATA: Show remaining time MM:SS
    const mm = Math.floor(timeRemaining / 60)
    const ss = timeRemaining % 60
    displayTime = `${pad(mm)}:${pad(ss)}`

    if (phase === 'WORK') {
      phaseColor = '#EF4444' // Red
      phaseLabel = 'WORK'
    } else if (phase === 'REST') {
      phaseColor = '#22C55E' // Green
      phaseLabel = 'REST'
    } else {
      phaseColor = '#3B82F6' // Blue
      phaseLabel = 'COOLDOWN'
    }
  } else {
    // IDLE or default
    displayTime = '00:00'
    phaseColor = '#6B7280' // Gray
    phaseLabel = 'READY'
  }

  const ariaLabel = `${phaseLabel}. Time: ${displayTime}.`

  return (
    <Card
      elevation={6}
      role="timer"
      aria-live="polite"
      aria-label={ariaLabel}
      sx={{
        backgroundColor: '#000000', // Pure black for high energy
        color: phaseColor, // Dynamic color based on phase
        height: '100%',
        display: 'flex',
        borderRadius: 2,
        border: '2px solid #1a1a1a', // Subtle border for definition
        position: 'relative',
      }}
    >
      {/* Mode Indicator - Rotated on left side */}
      {phase !== 'IDLE' && (
        <Box
          sx={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%) rotate(-90deg)',
            transformOrigin: 'center',
            zIndex: 1,
          }}
        >
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 700,
              letterSpacing: 2,
              whiteSpace: 'nowrap',
              fontSize: '0.9rem',
              backgroundColor: 'rgba(255,255,255,0.1)',
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            {mode === 'STOPWATCH' ? 'STOPWATCH' : 'TABATA'}
          </Typography>
        </Box>
      )}

      {/* Tabata Durations - Rotated on right side */}
      {mode === 'TABATA' && (
        <Box
          sx={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%) rotate(90deg)',
            transformOrigin: 'center',
            zIndex: 1,
          }}
        >
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 700,
              letterSpacing: 1,
              whiteSpace: 'nowrap',
              fontSize: '0.8rem',
              backgroundColor: 'rgba(255,255,255,0.1)',
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            WORK:{workDuration}s REST:{restDuration}s
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
        {/* Phase Label - only show for Tabata phases, not RUNNING */}
        {phase !== 'IDLE' && phase !== 'RUNNING' && (
          <Typography
            variant="h6"
            sx={{
              mb: 1,
              color: phaseColor,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            {phaseLabel}
          </Typography>
        )}

        {/* Giant Timer Display */}
        <Typography
          component="div"
          aria-atomic="true"
          sx={{
            fontFamily: 'var(--font-roboto-mono), monospace',
            fontSize: { xs: '6rem', sm: '8rem', md: '10rem' },
            fontWeight: 800,
            letterSpacing: '0.12rem',
            lineHeight: 1,
            color: phaseColor,
            textShadow: `0 0 20px ${phaseColor}80`,
          }}
        >
          {displayTime}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default memo(TimerDisplay)

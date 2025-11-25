// File: components/TimerDisplay.tsx
'use client'
import { getTimerPhaseProps } from '@/utils/visualization'
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

const TimerDisplay = ({
  phase,
  timeRemaining,
  timeElapsed,
  mode,
  workDuration = 20,
  restDuration = 10,
}: TimerDisplayProps) => {
  const {
    displayTime,
    color,
    label: phaseLabel,
  } = getTimerPhaseProps(phase, timeRemaining, timeElapsed, mode)

  return (
    <Card
      elevation={6}
      sx={{
        backgroundColor: 'background.paper',
        height: '100%',
        display: 'flex',
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Mode Indicator - Top Left */}
      {phase !== 'IDLE' && (
        <Box
          sx={{
            position: 'absolute',
            left: 16,
            top: 16,
            zIndex: 1,
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              letterSpacing: 1.5,
              backgroundColor: 'rgba(0,0,0,0.2)',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            {mode}
          </Typography>
        </Box>
      )}

      {/* Tabata Durations - Top Right */}
      {mode === 'TABATA' && (
        <Box
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            zIndex: 1,
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              letterSpacing: 1,
              backgroundColor: 'rgba(0,0,0,0.2)',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            {`W: ${workDuration}s / R: ${restDuration}s`}
          </Typography>
        </Box>
      )}

      <CardContent
        sx={{
          p: { xs: 2, sm: 3 },
          textAlign: 'center',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Phase Label */}
        {phase !== 'IDLE' && phase !== 'RUNNING' && (
          <Typography
            variant="h4"
            sx={{
              mb: 1,
              color: color,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            {phaseLabel}
          </Typography>
        )}

        {/* Giant Timer Display */}
        <Typography
          component="div"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          sx={{
            fontFamily: 'var(--font-roboto-mono), monospace',
            fontSize: { xs: '5rem', sm: '7rem', md: '9rem' },
            fontWeight: 700,
            letterSpacing: '0.1rem',
            lineHeight: 1.1,
            color: color,
            textShadow: (theme) =>
              `0 0 12px ${theme.palette.mode === 'dark' ? color : 'transparent'}`,
          }}
        >
          {displayTime}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default memo(TimerDisplay)

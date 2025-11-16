// File: components/TimerDisplay.tsx
'use client'
import { Box, Card, CardContent, Typography, Chip } from '@mui/material'
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

// Maps timer phases to MUI theme colors for consistent styling
const phaseStyles: Record<
  TimerPhase,
  { color: 'error' | 'success' | 'warning' | 'info' | 'primary' | 'grey'; label: string }
> = {
  IDLE: { color: 'grey', label: 'READY' },
  PREPARE: { color: 'warning', label: 'GET READY' },
  WORK: { color: 'error', label: 'WORK' },
  REST: { color: 'success', label: 'REST' },
  COOLDOWN: { color: 'info', label: 'COOLDOWN' },
  RUNNING: { color: 'primary', label: 'RUNNING' }, // For Stopwatch
}

const TimerDisplay = ({
  phase,
  timeRemaining,
  timeElapsed,
  cycle,
  totalCycles,
  mode,
  workDuration = 20,
  restDuration = 10,
}: TimerDisplayProps) => {
  const { color: phaseColor, label: phaseLabel } =
    phaseStyles[phase] || phaseStyles.IDLE

  // Determine the primary time to display
  let displayTime: string
  if (phase === 'PREPARE') {
    displayTime = pad(timeRemaining)
  } else if (mode === 'STOPWATCH') {
    const mm = Math.floor(timeElapsed / 60)
    const ss = timeElapsed % 60
    displayTime = `${pad(mm)}:${pad(ss)}`
  } else {
    // Default to timeRemaining for Tabata phases (WORK, REST, etc.) or IDLE
    const mm = Math.floor(timeRemaining / 60)
    const ss = timeRemaining % 60
    displayTime = `${pad(mm)}:${pad(ss)}`
  }

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center',
        p: { xs: 2, sm: 3 },
        position: 'relative', // for positioning chips
      }}
    >
      {/* Mode and Duration Info Chips */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Chip label={mode} color="secondary" variant="outlined" size="small" />
        {mode === 'TABATA' && (
          <Chip
            label={`W: ${workDuration}s / R: ${restDuration}s`}
            variant="outlined"
            size="small"
          />
        )}
      </Box>

      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexGrow: 1,
        }}
      >
        {/* Phase Label */}
        <Typography
          variant="h4"
          component="div"
          sx={{ fontWeight: 'bold', color: `${phaseColor}.main`, mb: 1 }}
        >
          {phaseLabel}
        </Typography>

        {/* Giant Timer Display */}
        <Typography
          component="div"
          role="timer"
          aria-live="polite"
          sx={{
            fontFamily: 'monospace',
            fontSize: { xs: '5rem', sm: '7rem', md: '9rem' },
            fontWeight: 'bold',
            lineHeight: 1.1,
            color: 'text.primary',
          }}
        >
          {displayTime}
        </Typography>

        {/* Cycle Counter (Tabata only) */}
        {mode === 'TABATA' && cycle > 0 && (
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ mt: 2 }}
          >
            Cycle {cycle} / {totalCycles}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default TimerDisplay

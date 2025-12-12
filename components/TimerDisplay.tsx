// File: components/TimerDisplay.tsx
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'
import { memo } from 'react'
import { TimerMode, TimerPhase } from '../types/websocket'

export interface TimerDisplayProps {
  phase: TimerPhase
  timeRemaining: number // seconds (for countdown)
  timeElapsed: number // seconds (for stopwatch)
  mode: TimerMode
  workDuration?: number
  restDuration?: number
  soundEventId?: number // Sound cue trigger
  volume?: number // Master volume
}

// Define duration colors as constants for maintainability
const DURATION_WORK_COLOR = '#EF4444' // Red
const DURATION_REST_COLOR = '#22C55E' // Green

const pad = (n: number) => String(n).padStart(2, '0')

const TimerDisplay = ({
  phase,
  timeRemaining,
  timeElapsed,
  mode,
  workDuration = 20,
  restDuration = 10,
}: TimerDisplayProps) => {
  const { connectionStatus } = useWebSocket()

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

  return (
    <Card
      elevation={6}
      data-testid="timer-display-container"
      sx={{
        backgroundColor: '#000000', // Pure black for high energy
        color: phaseColor, // Dynamic color based on phase
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        border: '2px solid #1a1a1a', // Subtle border for definition
        position: 'relative',
        animation:
          phase === 'WORK' || phase === 'REST'
            ? 'pulse-opacity 1.5s infinite'
            : 'none',
      }}
    >
      {/* Header: Mode & Status */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          pt: 2,
          zIndex: 2,
        }}
      >
        {/* Mode Indicator (Left) */}
        <Box>
          {phase !== 'IDLE' && (
            <Chip
              label={mode === 'STOPWATCH' ? 'STOPWATCH' : 'TABATA'}
              size="small"
              // Status role to indicate information
              role="status"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontWeight: 700,
                letterSpacing: 1,
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
              }}
            />
          )}
        </Box>

        {/* Status Indicator (Right) */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: '#fff', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}
            data-testid="ws-status-indicator"
          >
            {connectionStatus}
          </Typography>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor:
                connectionStatus === 'Connected'
                  ? '#10B981'
                  : connectionStatus === 'Reconnecting...'
                    ? '#F59E0B'
                    : '#EF4444',
              animation:
                connectionStatus === 'Connected' ? 'pulse 2s infinite' : 'none',
            }}
          />
        </Box>
      </Box>

      {/* Main Content: Timer */}
      <CardContent
        sx={{
          p: { xs: 1, md: 2 }, // Reduced padding to give more space for header/footer
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
            data-testid="timer-phase"
            variant="h6"
            aria-live="polite"
            sx={{
              mb: 1,
              color: phaseColor,
              fontWeight: 700,
              letterSpacing: 2,
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}
          >
            {phaseLabel}
          </Typography>
        )}

        {/* Giant Timer Display */}
        <Typography
          data-testid="timer-countdown"
          component="div"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          sx={{
            fontFamily: 'var(--font-roboto-mono), monospace',
            fontSize: { xs: '6rem', sm: '8rem', md: '10rem' }, // Reverted to 6rem for XS based on review feedback
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

      {/* Footer: Tabata Durations */}
      {mode === 'TABATA' && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pb: 2,
            px: 2,
          }}
        >
          <Stack direction="row" spacing={2}>
            <Chip
              label={`WORK: ${workDuration}s`}
              // Status role to indicate information
              role="status"
              sx={{
                backgroundColor: alpha(DURATION_WORK_COLOR, 0.15),
                color: DURATION_WORK_COLOR,
                borderColor: DURATION_WORK_COLOR,
                borderWidth: 1,
                borderStyle: 'solid',
                fontWeight: 700,
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
              }}
            />
            <Chip
              label={`REST: ${restDuration}s`}
              // Status role to indicate information
              role="status"
              sx={{
                backgroundColor: alpha(DURATION_REST_COLOR, 0.15),
                color: DURATION_REST_COLOR,
                borderColor: DURATION_REST_COLOR,
                borderWidth: 1,
                borderStyle: 'solid',
                fontWeight: 700,
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
              }}
            />
          </Stack>
        </Box>
      )}
    </Card>
  )
}

export default memo(TimerDisplay)

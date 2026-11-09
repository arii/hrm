// File: components/TimerDisplay.tsx
'use client'
import {
  useTimerData,
  useWebSocketConnection,
} from '@/context/WebSocketContext'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import SideLabel from './SideLabel'
import { useIsScaledLayout } from '@/components/ScaledStage'
import { formatDuration } from '@/lib/utils'
import { useTheme } from '@mui/material/styles'
import type { TimerMode, TimerPhase } from '@/types/core'

// Define a constant for the side column width to avoid magic numbers
const SIDE_COLUMN_WIDTH = '40px'

// Theme colors the phase policy needs, passed in so the policy stays
// pure (no private hex values; the timer shares the dashboard palette).
export interface TimerPhasePalette {
  warningDark: string
  infoMain: string
  errorMain: string
  successMain: string
  textSecondary: string
}

interface TimerPhaseVisual {
  displayTime: string
  phaseColor: string
  phaseLabel: string
}

// TABATA sub-policy: WORK/REST/COOLDOWN color and label. The caller
// guarantees a TABATA phase, so anything else is COOLDOWN by elimination.
const resolveTabataPhase = (
  currentPhase: TimerPhase,
  palette: TimerPhasePalette
): { phaseColor: string; phaseLabel: string } =>
  currentPhase === 'WORK'
    ? { phaseColor: palette.errorMain, phaseLabel: 'WORK' }
    : currentPhase === 'REST'
      ? { phaseColor: palette.successMain, phaseLabel: 'REST' }
      : { phaseColor: palette.infoMain, phaseLabel: 'COOLDOWN' }

// Phase display policy: which time, color, and label each mode/phase
// combination shows. Pure: unit-tested, including the mode-gated
// fallbacks (a phase outside its mode renders ready, never stale).
export const resolveTimerPhaseVisual = (
  input: {
    mode: TimerMode
    currentPhase: TimerPhase
    timeRemaining: number
    timeElapsed: number
  },
  palette: TimerPhasePalette
): TimerPhaseVisual => {
  // PREPARE: Show countdown seconds only
  if (input.currentPhase === 'PREPARE') {
    return {
      displayTime: String(input.timeRemaining).padStart(2, '0'),
      phaseColor: palette.warningDark,
      phaseLabel: 'GET READY',
    }
  }
  // STOPWATCH: Show elapsed time MM:SS
  if (input.mode === 'STOPWATCH' && input.currentPhase === 'RUNNING') {
    return {
      displayTime: formatDuration(input.timeElapsed, {
        unit: 'seconds',
        format: 'MM:SS',
      }),
      phaseColor: palette.infoMain,
      phaseLabel: 'RUNNING',
    }
  }
  // TABATA: Show remaining time MM:SS
  if (
    input.mode === 'TABATA' &&
    (input.currentPhase === 'WORK' ||
      input.currentPhase === 'REST' ||
      input.currentPhase === 'COOLDOWN')
  ) {
    return {
      displayTime: formatDuration(input.timeRemaining, {
        unit: 'seconds',
        format: 'MM:SS',
      }),
      ...resolveTabataPhase(input.currentPhase, palette),
    }
  }
  // IDLE or default
  return {
    displayTime: formatDuration(0, { unit: 'seconds', format: 'MM:SS' }),
    phaseColor: palette.textSecondary,
    phaseLabel: 'READY',
  }
}

export const resolveWsDotColor = (
  connectionStatus: string,
  palette: TimerPhasePalette
): string =>
  connectionStatus === 'Connected'
    ? palette.successMain
    : connectionStatus === 'Reconnecting...'
      ? palette.warningDark
      : palette.errorMain

const TimerDisplay = () => {
  const timerData = useTimerData()
  const { connectionStatus } = useWebSocketConnection()
  const theme = useTheme()
  // Scaled mode pins the target-composition (md-breakpoint) sizes so
  // the canvas never reflips with the real window size.
  const isScaledLayout = useIsScaledLayout()
  const {
    currentPhase,
    timeRemaining,
    timeElapsed,
    mode,
    workDuration = 20,
    restDuration = 10,
  } = timerData

  // Phase colors resolve through the MUI theme so the timer shares the
  // single palette with the rest of the dashboard (no private hex values).
  const palette: TimerPhasePalette = {
    warningDark: theme.palette.warning.dark,
    infoMain: theme.palette.info.main,
    errorMain: theme.palette.error.main,
    successMain: theme.palette.success.main,
    textSecondary: theme.palette.text.secondary,
  }
  const { displayTime, phaseColor, phaseLabel } = resolveTimerPhaseVisual(
    { mode, currentPhase, timeRemaining, timeElapsed },
    palette
  )

  const wsDotColor = resolveWsDotColor(connectionStatus, palette)

  return (
    <Card
      elevation={6}
      data-testid="timer-display-container"
      sx={{
        backgroundColor: theme.palette.common.black,
        color: phaseColor, // Dynamic color based on phase
        // Container queries let the digits scale with the timer's
        // horizontal width when the top row shrinks it to ~38% for 3 tiles.
        containerType: 'inline-size',
        // Ensure the card fills the grid cell height
        height: '100%',
        maxHeight: '100%',
        width: '100%',
        minHeight: isScaledLayout
          ? '20rem'
          : { xs: '8.5rem', sm: '10.5rem', md: '12.5rem' },
        display: 'flex',
        borderRadius: 2,
        border: `2px solid ${theme.palette.grey[900]}`,
        position: 'relative',
        overflow: 'hidden',
        animation:
          currentPhase === 'WORK' || currentPhase === 'REST'
            ? 'pulse-opacity 1.5s infinite'
            : 'none',
      }}
    >
      {/* Status Indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: theme.palette.common.white }}
          data-testid="ws-status-indicator"
        >
          {connectionStatus}
        </Typography>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: wsDotColor,
            animation:
              connectionStatus === 'Connected' ? 'pulse 2s infinite' : 'none',
          }}
        />
      </Box>
      {/* Left Column: Mode Indicator */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: SIDE_COLUMN_WIDTH,
        }}
      >
        {currentPhase !== 'IDLE' && (
          <SideLabel
            text={mode === 'STOPWATCH' ? 'STOPWATCH' : 'TABATA'}
            ariaLabel={`Timer mode: ${mode}`}
            rotation="left"
          />
        )}
      </Box>
      {/* Right Column: Tabata Durations. Vertical rail keeps the
          durations out of the digits' vertical budget. */}
      <Box
        data-testid="timer-work-rest-badge"
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: SIDE_COLUMN_WIDTH,
        }}
      >
        {mode === 'TABATA' && (
          <SideLabel
            text={`WORK:${workDuration}s REST:${restDuration}s`}
            ariaLabel={`Work duration: ${workDuration} seconds, Rest duration: ${restDuration} seconds`}
            rotation="right"
          />
        )}
      </Box>
      <CardContent
        sx={{
          position: 'relative',
          width: '100%',
          py: isScaledLayout ? 1.5 : { xs: 1, md: 1.5 },
          px: SIDE_COLUMN_WIDTH,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 0, // Prevent content from overflowing
        }}
      >
        {/* Phase Label - only show for Tabata phases, not RUNNING */}
        {currentPhase !== 'IDLE' && currentPhase !== 'RUNNING' && (
          <Typography
            data-testid="timer-phase"
            variant="h6"
            aria-live="polite"
            sx={{
              mb: 0.5,
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
          data-testid="timer-countdown"
          component="div"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          sx={{
            fontFamily: 'var(--font-digital-7), monospace',
            // Scale with the timer container width (cqw) so digits never
            // clip when the top row narrows; clamped to safe bounds.
            fontSize: isScaledLayout
              ? 'clamp(4rem, 26cqw, 16rem)'
              : 'clamp(4rem, 26cqw, 13rem)',
            fontWeight: 900,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            color: phaseColor,
            textShadow: `0 0 10px ${phaseColor}`,
            letterSpacing: '0.05em',
            transition: 'color 0.3s ease-in-out',
          }}
        >
          {displayTime}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default memo(TimerDisplay)

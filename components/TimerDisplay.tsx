// File: components/TimerDisplay.tsx
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import SideLabel from './SideLabel'
import { formatDuration } from '@/lib/utils'
import { useTheme } from '@mui/material/styles'

// Define a constant for the side column width to avoid magic numbers
const SIDE_COLUMN_WIDTH = '40px'

const TimerDisplay = () => {
  const { connectionStatus, timerData } = useWebSocket()
  const theme = useTheme()
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
  let displayTime: string
  let phaseColor: string
  let phaseLabel: string

  if (currentPhase === 'PREPARE') {
    // PREPARE: Show countdown seconds only
    displayTime = String(timeRemaining).padStart(2, '0')
    phaseColor = theme.palette.warning.dark
    phaseLabel = 'GET READY'
  } else if (mode === 'STOPWATCH' && currentPhase === 'RUNNING') {
    // STOPWATCH: Show elapsed time MM:SS
    displayTime = formatDuration(timeElapsed, {
      unit: 'seconds',
      format: 'MM:SS',
    })
    phaseColor = theme.palette.info.main
    phaseLabel = 'RUNNING'
  } else if (
    mode === 'TABATA' &&
    (currentPhase === 'WORK' ||
      currentPhase === 'REST' ||
      currentPhase === 'COOLDOWN')
  ) {
    // TABATA: Show remaining time MM:SS
    displayTime = formatDuration(timeRemaining, {
      unit: 'seconds',
      format: 'MM:SS',
    })

    if (currentPhase === 'WORK') {
      phaseColor = theme.palette.error.main
      phaseLabel = 'WORK'
    } else if (currentPhase === 'REST') {
      phaseColor = theme.palette.success.main
      phaseLabel = 'REST'
    } else {
      phaseColor = theme.palette.info.main
      phaseLabel = 'COOLDOWN'
    }
  } else {
    // IDLE or default
    displayTime = formatDuration(0, { unit: 'seconds', format: 'MM:SS' })
    phaseColor = theme.palette.text.secondary
    phaseLabel = 'READY'
  }

  const wsDotColor =
    connectionStatus === 'Connected'
      ? theme.palette.success.main
      : connectionStatus === 'Reconnecting...'
        ? theme.palette.warning.dark
        : theme.palette.error.main

  return (
    <Card
      elevation={6}
      data-testid="timer-display-container"
      sx={{
        backgroundColor: theme.palette.common.black,
        color: phaseColor, // Dynamic color based on phase
        // Ensure the card fills the grid cell height
        height: '100%',
        minHeight: { xs: 200, sm: 220, md: 200 },
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
      <CardContent
        sx={{
          position: 'relative',
          width: '100%',
          py: { xs: 2, md: 3 },
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
          data-testid="timer-countdown"
          component="div"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          sx={{
            fontFamily: 'var(--font-digital-7), monospace',
            // Viewport-aware at md+: short screens (laptop/TV) shrink the
            // digits so the whole dashboard fits without page scroll; tall
            // screens keep the full 14rem.
            fontSize: {
              xs: '7rem',
              sm: '10rem',
              md: 'clamp(7rem, 22vh, 14rem)',
            },
            fontWeight: 900,
            lineHeight: 1,
            textAlign: 'center',
            color: phaseColor,
            textShadow: `0 0 10px ${phaseColor}`,
            letterSpacing: '0.05em',
            transition: 'color 0.3s ease-in-out',
          }}
        >
          {displayTime}
        </Typography>

        {/* WORK/REST badge: horizontal pill replacing the rotated rail */}
        {mode === 'TABATA' && (
          <Box
            data-testid="timer-work-rest-badge"
            aria-label={`Work duration: ${workDuration} seconds, Rest duration: ${restDuration} seconds`}
            sx={{
              mt: 2,
              px: 2.5,
              py: 0.75,
              borderRadius: 999,
              border: `1px solid ${theme.palette.grey[800]}`,
              backgroundColor: theme.palette.grey[900],
              color: theme.palette.common.white,
              fontSize: '0.95rem',
              fontWeight: 600,
              letterSpacing: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {`WORK:${workDuration}s REST:${restDuration}s`}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default memo(TimerDisplay)

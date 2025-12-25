// File: components/TimerDisplay.tsx
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import { memo } from 'react'
import { TimerConnectionStatus } from './TimerConnectionStatus'
import { TimerVolumeControl } from './TimerVolumeControl'

const pad = (n: number) => String(n).padStart(2, '0')

const getPhaseStyle = (phase, mode, theme) => {
  switch (phase) {
    case 'PREPARE':
      return {
        color: theme.palette.warning.main,
        label: 'GET READY',
      }
    case 'WORK':
      return {
        color: theme.palette.error.main,
        label: 'WORK',
      }
    case 'REST':
      return {
        color: theme.palette.success.main,
        label: 'REST',
      }
    case 'COOLDOWN':
      return {
        color: theme.palette.info.main,
        label: 'COOLDOWN',
      }
    case 'RUNNING':
      if (mode === 'STOPWATCH') {
        return {
          color: theme.palette.info.main,
          label: 'RUNNING',
        }
      }
      return {
        color: theme.palette.grey[500],
        label: 'READY',
      }
    default:
      return {
        color: theme.palette.grey[500],
        label: 'READY',
      }
  }
}

const formatDisplayTime = (phase, mode, timeRemaining, timeElapsed) => {
  if (phase === 'PREPARE') {
    return String(timeRemaining).padStart(2, '0')
  }
  if (mode === 'STOPWATCH' && phase === 'RUNNING') {
    const mm = Math.floor(timeElapsed / 60)
    const ss = timeElapsed % 60
    return `${pad(mm)}:${pad(ss)}`
  }
  if (mode === 'TABATA') {
    const mm = Math.floor(timeRemaining / 60)
    const ss = timeRemaining % 60
    return `${pad(mm)}:${pad(ss)}`
  }
  return '00:00'
}

const TimerDisplay = () => {
  const theme = useTheme()
  const { timerData } = useWebSocket()
  const {
    currentPhase,
    timeRemaining,
    timeElapsed,
    mode,
    workDuration = 20,
    restDuration = 10,
  } = timerData

  const { color, label } = getPhaseStyle(currentPhase, mode, theme)
  const displayTime = formatDisplayTime(
    currentPhase,
    mode,
    timeRemaining,
    timeElapsed
  )
  const contrastTextColor = theme.palette.getContrastText(color)

  return (
    <Card
      elevation={6}
      data-testid="timer-display-container"
      sx={{
        backgroundColor: color,
        height: '100%',
        display: 'flex',
        borderRadius: 2,
        position: 'relative',
        animation:
          currentPhase === 'WORK' || currentPhase === 'REST'
            ? 'pulse-opacity 1.5s infinite'
            : 'none',
        flexDirection: 'row', // Main layout change
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
      }}
    >
      <TimerConnectionStatus />

      {/* Left Column: Mode Indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {currentPhase !== 'IDLE' && (
          <Typography
            variant="body2"
            sx={{
              color: contrastTextColor,
              fontWeight: 700,
              letterSpacing: 2,
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              whiteSpace: 'nowrap',
            }}
          >
            {mode === 'STOPWATCH' ? 'STOPWATCH' : 'TABATA'}
          </Typography>
        )}
      </Box>

      {/* Center Column: Timer and Controls */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {currentPhase !== 'IDLE' && currentPhase !== 'RUNNING' && (
          <Typography
            data-testid="timer-phase"
            variant="h6"
            aria-live="polite"
            sx={{
              color: contrastTextColor,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            {label}
          </Typography>
        )}
        <Typography
          data-testid="timer-countdown"
          component="div"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          sx={{
            fontFamily: 'var(--font-roboto-mono), monospace',
            fontSize: { xs: '6rem', sm: '8rem', md: '10rem' },
            fontWeight: 800,
            lineHeight: 1,
            color: contrastTextColor,
          }}
        >
          {displayTime}
        </Typography>
        <TimerVolumeControl
          textColor={contrastTextColor}
          thumbColor={contrastTextColor}
        />
      </Box>

      {/* Right Column: Tabata Durations */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {mode === 'TABATA' && (
          <Typography
            variant="body2"
            sx={{
              color: contrastTextColor,
              fontWeight: 700,
              letterSpacing: 1,
              writingMode: 'vertical-rl',
              whiteSpace: 'nowrap',
            }}
          >
            WORK:{workDuration}s REST:{restDuration}s
          </Typography>
        )}
      </Box>
    </Card>
  )
}

export default memo(TimerDisplay)

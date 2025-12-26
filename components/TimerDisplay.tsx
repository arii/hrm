// File: components/TimerDisplay.tsx
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import VolumeDown from '@mui/icons-material/VolumeDown'
import VolumeUp from '@mui/icons-material/VolumeUp'
import VolumeOff from '@mui/icons-material/VolumeOff'
import IconButton from '@mui/material/IconButton'

import { useAudioContext } from '@/context/AudioContext'

const pad = (n: number) => String(n).padStart(2, '0')

const TimerDisplay = () => {
  const { connectionStatus, timerData } = useWebSocket()
  const { volume, setVolume, muted, toggleMute } = useAudioContext()
  const {
    currentPhase,
    timeRemaining,
    timeElapsed,
    mode,
    workDuration = 20,
    restDuration = 10,
  } = timerData

  // Determine what to display based on mode and phase
  let displayTime: string
  let phaseColor: string
  let phaseLabel: string

  if (currentPhase === 'PREPARE') {
    // PREPARE: Show countdown seconds only
    displayTime = String(timeRemaining).padStart(2, '0')
    phaseColor = '#F59E0B' // Yellow/Warning
    phaseLabel = 'GET READY'
  } else if (mode === 'STOPWATCH' && currentPhase === 'RUNNING') {
    // STOPWATCH: Show elapsed time MM:SS
    const mm = Math.floor(timeElapsed / 60)
    const ss = timeElapsed % 60
    displayTime = `${pad(mm)}:${pad(ss)}`
    phaseColor = '#2563EB' // Blue/Primary
    phaseLabel = 'RUNNING'
  } else if (
    mode === 'TABATA' &&
    (currentPhase === 'WORK' ||
      currentPhase === 'REST' ||
      currentPhase === 'COOLDOWN')
  ) {
    // TABATA: Show remaining time MM:SS
    const mm = Math.floor(timeRemaining / 60)
    const ss = timeRemaining % 60
    displayTime = `${pad(mm)}:${pad(ss)}`

    if (currentPhase === 'WORK') {
      phaseColor = '#EF4444' // Red
      phaseLabel = 'WORK'
    } else if (currentPhase === 'REST') {
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

  // Extracted logic for clarity, per code review
  const isTimerActive = currentPhase !== 'IDLE'
  const showPhaseLabel = isTimerActive && currentPhase !== 'RUNNING'
  const modeLabel = mode === 'STOPWATCH' ? 'STOPWATCH' : 'TABATA'

  return (
    <Card
      elevation={6}
      data-testid="timer-display-container"
      sx={{
        backgroundColor: '#000000', // Pure black for high energy
        color: phaseColor, // Dynamic color based on phase
        height: '100%',
        display: 'flex',
        flexDirection: 'row', // Main layout is a row
        alignItems: 'center', // Center items vertically
        borderRadius: 2,
        border: '2px solid #1a1a1a', // Subtle border for definition
        position: 'relative', // Keep for the status indicator
        animation:
          currentPhase === 'WORK' || currentPhase === 'REST'
            ? 'pulse-opacity 1.5s infinite'
            : 'none',
        overflow: 'hidden', // Prevents rotated text from causing layout shifts
        p: { xs: 1, sm: 2 }, // Add padding to the card itself
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
          zIndex: 2, // Must be on top
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: '#fff' }}
          data-testid="ws-status-indicator"
        >
          {connectionStatus}
        </Typography>
        <Box
          sx={{
            width: 12,
            height: 12,
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

      {/* Left Column: Mode Indicator */}
      <Box
        sx={(theme) => ({
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0, // Prevent this column from shrinking
          width: { xs: theme.spacing(4), sm: theme.spacing(5) }, // Use theme spacing
        })}
      >
        {isTimerActive && (
          <Typography
            variant="body2"
            aria-label={`Timer mode is ${modeLabel}`}
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
              transform: 'rotate(-90deg)',
            }}
          >
            {modeLabel}
          </Typography>
        )}
      </Box>

      {/* Center Column: Main Timer Content */}
      <CardContent
        sx={{
          flexGrow: 1, // This will take up the available space
          minWidth: 0, // Allow the content to shrink
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 1, md: 2 }, // Adjust padding inside the content
        }}
      >
        {/* Phase Label - only show for Tabata phases, not RUNNING */}
        {showPhaseLabel && (
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
            fontFamily: 'var(--font-roboto-mono), monospace',
            fontSize: { xs: '5rem', sm: '7rem', md: '9rem' },
            fontWeight: 800,
            letterSpacing: '0.12rem',
            lineHeight: 1,
            color: phaseColor,
            textShadow: `0 0 20px ${phaseColor}80`,
          }}
        >
          {displayTime}
        </Typography>

        {/* Volume Control */}
        <Stack
          spacing={{ xs: 1, sm: 2 }}
          direction="row"
          sx={{
            mt: 2,
            mb: 1,
            width: { xs: '90%', md: '80%' },
            maxWidth: 300,
          }}
          alignItems="center"
        >
          <IconButton onClick={toggleMute} sx={{ color: 'white' }}>
            {muted || volume === 0 ? <VolumeOff /> : <VolumeDown />}
          </IconButton>
          <Slider
            aria-label="Volume"
            value={muted ? 0 : volume}
            onChange={(_, newValue) => setVolume(newValue as number)}
            sx={{
              color: 'white',
              '& .MuiSlider-thumb': {
                color: phaseColor,
              },
            }}
          />
          <VolumeUp sx={{ color: 'white' }} />
        </Stack>
      </CardContent>

      {/* Right Column: Tabata Durations */}
      <Box
        sx={(theme) => ({
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0, // Prevent this column from shrinking
          width: { xs: theme.spacing(4), sm: theme.spacing(5) }, // Use theme spacing
        })}
      >
        {mode === 'TABATA' && (
          <Typography
            variant="body2"
            aria-label={`Work duration ${workDuration} seconds, Rest duration ${restDuration} seconds`}
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
              transform: 'rotate(90deg)',
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

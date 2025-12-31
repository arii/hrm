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
import SideLabel from './SideLabel'
import { useAudioContext } from '@/context/AudioContext'

const pad = (n: number) => String(n).padStart(2, '0')

// Define a constant for the side column width to avoid magic numbers
const SIDE_COLUMN_WIDTH = '40px'

const TimerDisplay = () => {
  const { connectionStatus, timerData } = useWebSocket()
  const { volume, setVolume, muted, toggleMute } = useAudioContext()
  const {
    currentPhase: phase,
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
        borderRadius: 2,
        border: '2px solid #1a1a1a', // Subtle border for definition
        position: 'relative',
        animation:
          phase === 'WORK' || phase === 'REST'
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
          zIndex: 2,
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
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: `0 0 ${SIDE_COLUMN_WIDTH}`,
        }}
      >
        {phase !== 'IDLE' && (
          <SideLabel
            text={mode === 'STOPWATCH' ? 'STOPWATCH' : 'TABATA'}
            ariaLabel={`Timer mode: ${mode}`}
            rotation="left"
          />
        )}
      </Box>
      <CardContent
        sx={{
          py: { xs: 2, md: 3 },
          textAlign: 'center',
          flex: 1, // Main content takes up the remaining space
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 0, // Prevent content from overflowing
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
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: `0 0 ${SIDE_COLUMN_WIDTH}`,
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
    </Card>
  )
}

export default memo(TimerDisplay)

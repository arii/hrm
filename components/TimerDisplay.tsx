// components/TimerDisplay.tsx
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
import { formatDuration } from '@/lib/utils'

// Define a constant for the side column width to avoid magic numbers
const SIDE_COLUMN_WIDTH = '40px'

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
    displayTime = formatDuration(timeElapsed, {
      unit: 'seconds',
      format: 'MM:SS',
    })
    phaseColor = '#2563EB' // Blue/Primary
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
    displayTime = formatDuration(0, { unit: 'seconds', format: 'MM:SS' })
    phaseColor = '#6B7280' // Gray
    phaseLabel = 'READY'
  }

  return (
    <Card
      elevation={6}
      data-testid="timer-display-container"
      sx={{
        backgroundColor: '#000000',
        color: phaseColor, // Dynamic color based on phase
        // Ensure the card fills the grid cell height
        height: '100%',
        minHeight: { xs: 200, sm: 250, md: 300 },
        display: 'flex',
        borderRadius: 2,
        border: '2px solid #1a1a1a',
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
            fontFamily: '"Roboto Mono", monospace',
            fontSize: { xs: '7rem', sm: '10rem', md: '14rem' },
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
          <IconButton
            onClick={toggleMute}
            sx={{ color: 'white' }}
            data-testid="timer-volume-mute-button"
          >
            {muted || volume === 0 ? <VolumeOff /> : <VolumeDown />}
          </IconButton>
          <Slider
            aria-label="Volume"
            value={muted ? 0 : volume}
            onChange={(_, newValue) => setVolume(newValue as number)}
            data-testid="timer-volume-slider"
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
    </Card>
  )
}

export default memo(TimerDisplay)

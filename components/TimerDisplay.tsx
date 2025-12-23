// File: components/TimerDisplay.tsx
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
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
  const theme = useTheme()
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
    phaseColor = theme.palette.warning.main
    phaseLabel = 'GET READY'
  } else if (mode === 'STOPWATCH' && currentPhase === 'RUNNING') {
    // STOPWATCH: Show elapsed time MM:SS
    const mm = Math.floor(timeElapsed / 60)
    const ss = timeElapsed % 60
    displayTime = `${pad(mm)}:${pad(ss)}`
    phaseColor = theme.palette.info.main
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
    displayTime = '00:00'
    phaseColor = theme.palette.text.secondary
    phaseLabel = 'READY'
  }

  return (
    <Card
      elevation={2}
      data-testid="timer-display-container"
      sx={{
        backgroundColor: 'background.paper',
        color: phaseColor, // Dynamic color based on phase
        height: '100%',
        display: 'flex',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
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
      {/* Mode Indicator - Rotated on left side */}
      {currentPhase !== 'IDLE' && (
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
            variant="body2"
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
            variant="body2"
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
          p: { xs: 3, md: 4 },
          textAlign: 'center',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Phase Label */}
        <Typography
          data-testid="timer-phase"
          variant="h5"
          component="div"
          aria-live="polite"
          sx={{
            mb: 1,
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'text.primary',
          }}
        >
          {phaseLabel}
        </Typography>

        {/* Giant Timer Display */}
        <Typography
          data-testid="timer-countdown"
          component="div"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          sx={{
            fontFamily: 'var(--font-roboto-mono), monospace',
            fontSize: { xs: '4.5rem', sm: '5.5rem', md: '7rem' },
            fontWeight: 'bold',
            lineHeight: 1.1,
            color: phaseColor,
            textShadow: `0 0 12px ${phaseColor}40`,
            transition: 'color 0.3s ease-in-out',
          }}
        >
          {displayTime}
        </Typography>

        {/* Volume Control */}
        <Stack
          spacing={2}
          direction="row"
          sx={{
            mt: 3,
            width: '100%',
            maxWidth: 280,
            color: 'text.secondary',
          }}
          alignItems="center"
        >
          <IconButton
            onClick={toggleMute}
            sx={{ color: 'text.secondary' }}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted || volume === 0 ? <VolumeOff /> : <VolumeDown />}
          </IconButton>
          <Slider
            aria-label="Volume"
            value={muted ? 0 : volume}
            onChange={(_, newValue) => setVolume(newValue as number)}
            sx={{
              color: 'text.secondary',
              '& .MuiSlider-thumb': {
                backgroundColor: 'primary.main',
              },
              '& .MuiSlider-rail': {
                opacity: 0.28,
              },
            }}
          />
          <VolumeUp />
        </Stack>
      </CardContent>
    </Card>
  )
}

export default memo(TimerDisplay)

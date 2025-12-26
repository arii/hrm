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
import { useTimerVisuals } from '@/hooks/useTimerVisuals'

const TimerDisplay = () => {
  const { connectionStatus, timerData } = useWebSocket()
  const { volume, setVolume, muted, toggleMute } = useAudioContext()
  const { mode, workDuration = 20, restDuration = 10, currentPhase } = timerData
  const { displayTime, phaseColor, phaseLabel } = useTimerVisuals(timerData)

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
          p: { xs: 2, md: 3 },
          textAlign: 'center',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
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
    </Card>
  )
}

export default memo(TimerDisplay)

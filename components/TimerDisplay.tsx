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
import VolumeOff from '@mui/icons-material/VolumeOff'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import SideLabel from '@/components/SideLabel'
import { useAudioContext } from '@/context/AudioContext'
import { formatDuration } from '@/lib/utils'
import { useTheme, useMediaQuery, alpha } from '@mui/material'

const SIDE_COLUMN_WIDTH = '40px'

const TimerDisplay = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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

  let displayTime: string
  let phaseColor: string
  let phaseLabel: string
  let progressPercentage = 0

  if (currentPhase === 'PREPARE') {
    displayTime = String(timeRemaining).padStart(2, '0')
    phaseColor = '#F59E0B'
    phaseLabel = 'GET READY'
    progressPercentage = (timeRemaining / 10) * 100
  } else if (mode === 'STOPWATCH' && currentPhase === 'RUNNING') {
    displayTime = formatDuration(timeElapsed, {
      unit: 'seconds',
      format: 'MM:SS',
    })
    phaseColor = '#2563EB'
    phaseLabel = 'RUNNING'
    progressPercentage = 100
  } else if (
    mode === 'TABATA' &&
    (currentPhase === 'WORK' ||
      currentPhase === 'REST' ||
      currentPhase === 'COOLDOWN')
  ) {
    displayTime = formatDuration(timeRemaining, {
      unit: 'seconds',
      format: 'MM:SS',
    })

    if (currentPhase === 'WORK') {
      phaseColor = '#EF4444'
      phaseLabel = 'WORK'
      progressPercentage = (timeRemaining / workDuration) * 100
    } else if (currentPhase === 'REST') {
      phaseColor = '#22C55E'
      phaseLabel = 'REST'
      progressPercentage = (timeRemaining / restDuration) * 100
    } else {
      phaseColor = '#3B82F6'
      phaseLabel = 'COOLDOWN'
      progressPercentage = 100
    }
  } else {
    displayTime = formatDuration(0, { unit: 'seconds', format: 'MM:SS' })
    phaseColor = '#6B7280'
    phaseLabel = 'READY'
    progressPercentage = 0
  }

  return (
    <Card
      elevation={6}
      data-testid="timer-display-container"
      sx={{
        backgroundColor: '#000000',
        color: phaseColor,
        height: '100%',
        maxHeight: 300,
        display: 'flex',
        borderRadius: 2,
        border: '2px solid #1a1a1a',
        position: 'relative',
        animation:
          currentPhase === 'WORK' || currentPhase === 'REST'
            ? 'pulse-opacity 1.5s infinite'
            : 'none',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          zIndex: 2,
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: '#fff', fontSize: '0.7rem' }}
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

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: `0 0 ${isMobile ? '30px' : SIDE_COLUMN_WIDTH}`,
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
          p: 1.5,
          '&:last-child': { pb: 1.5 },
          textAlign: 'center',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: {
            xs: theme.spacing(16),
            md: theme.spacing(19),
          },
          minWidth: 0,
        }}
      >
        <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
          <CircularProgress
            variant="determinate"
            value={progressPercentage}
            size={80}
            thickness={4}
            sx={{
              color: phaseColor,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
                transition: 'stroke-dashoffset 0.5s ease',
              },
            }}
          />
          <CircularProgress
            variant="determinate"
            value={100}
            size={80}
            thickness={4}
            sx={{
              color: alpha(theme.palette.common.white, 0.1),
              position: 'absolute',
              left: 0,
            }}
          />
        </Box>

        {currentPhase !== 'IDLE' && currentPhase !== 'RUNNING' && (
          <Typography
            variant="overline"
            data-testid="timer-phase"
            sx={{
              color: phaseColor,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: 1.5,
              mb: 0.5,
            }}
          >
            {phaseLabel}
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
<<<<<<< HEAD
=======
            fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
>>>>>>> origin/leader
            fontWeight: 800,
            lineHeight: 1,
            color: phaseColor,
            fontSize: { xs: '3.5rem', sm: '4.5rem', md: '5.5rem' },
            my: 0.5,
          }}
        >
          {displayTime}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ width: '80%', maxWidth: 200, mt: 0.5 }}
        >
          <IconButton
            size="small"
            onClick={toggleMute}
            sx={{ color: 'white' }}
            data-testid="timer-volume-mute-button"
          >
            {muted || volume === 0 ? (
              <VolumeOff fontSize="small" />
            ) : (
              <VolumeDown fontSize="small" />
            )}
          </IconButton>
          <Slider
            size="small"
            value={muted ? 0 : volume}
            onChange={(_, v) => setVolume(v as number)}
            data-testid="timer-volume-slider"
            sx={{
              py: 0,
              color: 'white',
              '& .MuiSlider-thumb': {
                color: phaseColor,
              },
            }}
          />
        </Stack>
      </CardContent>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: `0 0 ${isMobile ? '30px' : SIDE_COLUMN_WIDTH}`,
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

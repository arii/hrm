// File: components/TimerDisplay/index.tsx
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
import { motion, AnimatePresence } from 'framer-motion'

import { useAudioContext } from '@/context/AudioContext'
import PhaseBackground from './PhaseBackground'
import AnimatedCounter from './AnimatedCounter'
import ProgressRing from './ProgressRing'
import { TimerData, TimerPhase } from '@/types/core'
import { PREPARE_DURATION } from '@/constants/timer'

const pad = (n: number) => String(n).padStart(2, '0')

type PhaseProps = {
  [key in TimerPhase]: {
    color: string
    label: string
  }
}

const phaseProps: PhaseProps = {
  PREPARE: { color: '#f59e0b', label: 'GET READY' },
  WORK: { color: '#ef4444', label: 'WORK' },
  REST: { color: '#22c55e', label: 'REST' },
  RUNNING: { color: '#3b82f6', label: 'RUNNING' },
  IDLE: { color: '#6b7280', label: 'IDLE' },
  COOLDOWN: { color: '#6b7280', label: 'COOLDOWN' },
}

const getPhaseProps = (phase: TimerData['currentPhase']) => {
  return phaseProps[phase]
}

const TimerDisplay = () => {
  const { connectionStatus, timerData } = useWebSocket()
  const { volume, setVolume, muted, toggleMute } = useAudioContext()
  const {
    currentPhase,
    timeRemaining,
    timeElapsed,
    mode,
    workDuration = 1,
    restDuration = 1,
  } = timerData

  const { color: phaseColor, label: phaseLabel } = getPhaseProps(currentPhase)

  let displayTime: string
  let progressPercentage: number = 0

  if (currentPhase === 'PREPARE') {
    displayTime = String(timeRemaining)
    progressPercentage = (timeRemaining / PREPARE_DURATION) * 100
  } else if (mode === 'STOPWATCH' && currentPhase === 'RUNNING') {
    const mm = Math.floor(timeElapsed / 60)
    const ss = timeElapsed % 60
    displayTime = `${pad(mm)}:${pad(ss)}`
    progressPercentage = (ss / 60) * 100
  } else if (mode === 'TABATA') {
    const mm = Math.floor(timeRemaining / 60)
    const ss = timeRemaining % 60
    displayTime = `${pad(mm)}:${pad(ss)}`
    const duration = currentPhase === 'WORK' ? workDuration : restDuration
    progressPercentage =
      duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0
  } else {
    displayTime = '00:00'
  }

  return (
    <Card
      elevation={6}
      data-testid="timer-display-container"
      sx={{
        height: '100%',
        display: 'flex',
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <PhaseBackground phase={currentPhase} />

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
      <AnimatePresence>
        {currentPhase !== 'IDLE' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            style={{
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabata Durations - Rotated on right side */}
      <AnimatePresence>
        {mode === 'TABATA' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.5 }}
            style={{
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
          </motion.div>
        )}
      </AnimatePresence>

      <CardContent
        sx={{
          p: { xs: 2, md: 3 },
          textAlign: 'center',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <ProgressRing percentage={progressPercentage} phaseColor={phaseColor} />
        <Typography
          data-testid="timer-phase"
          variant="h6"
          aria-live="polite"
          sx={{
            mb: 1,
            color: phaseColor,
            fontWeight: 700,
            letterSpacing: 2,
            textShadow: '0 0 10px rgba(0,0,0,0.5)',
          }}
        >
          {phaseLabel}
        </Typography>

        <AnimatedCounter displayTime={displayTime} phaseColor={phaseColor} />

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

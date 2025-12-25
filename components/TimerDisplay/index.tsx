// components/TimerDisplay/index.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { Box } from '@mui/material'
import AnimatedCounter from './AnimatedCounter'
import PhaseBackground from './PhaseBackground'
import ProgressRing from './ProgressRing'
import { useTimer } from '@/context/TimerContext'
import { useAudio } from '@/context/AudioContext'
import { PREPARE_DURATION } from '@/constants/timer'

type TimerPhase = 'prepare' | 'work' | 'rest'

const TimerDisplay = () => {
  const { timerData } = useTimer()
  const { playSound } = useAudio()
  const [prevTime, setPrevTime] = useState(0)
  const [direction, setDirection] = useState<'up' | 'down'>('down')

  const { phase, timeRemaining, totalDuration } = useMemo(() => {
    if (!timerData) {
      return {
        phase: 'prepare' as TimerPhase,
        timeRemaining: PREPARE_DURATION,
        totalDuration: PREPARE_DURATION,
      }
    }

    const { phase, timeRemaining, settings } = timerData
    const currentPhase = phase.toLowerCase() as TimerPhase
    const totalDuration =
      currentPhase === 'work'
        ? settings.workDuration
        : currentPhase === 'rest'
          ? settings.restDuration
          : PREPARE_DURATION

    return { phase: currentPhase, timeRemaining, totalDuration }
  }, [timerData])

  useEffect(() => {
    if (timeRemaining !== prevTime) {
      setDirection(timeRemaining > prevTime ? 'up' : 'down')
      setPrevTime(timeRemaining)

      if (timeRemaining <= 3 && timeRemaining > 0) {
        playSound('countdown')
      } else if (timeRemaining === 0) {
        playSound('phaseEnd')
      }
    }
  }, [timeRemaining, prevTime, playSound])

  const progress =
    totalDuration > 0 ? (totalDuration - timeRemaining) / totalDuration : 0

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <PhaseBackground phase={phase} />
      <Box sx={{ zIndex: 1 }}>
        <ProgressRing
          progress={progress}
          phase={phase}
          phaseDuration={totalDuration}
        />
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <AnimatedCounter time={timeRemaining} direction={direction} />
        </Box>
      </Box>
    </Box>
  )
}

export default TimerDisplay

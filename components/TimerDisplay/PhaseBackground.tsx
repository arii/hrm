// File: components/TimerDisplay/PhaseBackground.tsx
'use client'
import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Box, useTheme } from '@mui/material'
import { TimerState } from '@/types/timer'
import { keyframes } from '@emotion/react'

const particles = Array.from({ length: 20 })

const getPhaseGradient = (phase: TimerState['currentPhase']) => {
  switch (phase) {
    case 'PREPARE':
      return 'linear-gradient(135deg, #fde047 0%, #f59e0b 100%)' // Yellow
    case 'WORK':
      return 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)' // Red
    case 'REST':
      return 'linear-gradient(135deg, #86efac 0%, #22c55e 100%)' // Green
    case 'RUNNING':
      return 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)' // Blue
    case 'IDLE':
    default:
      return 'linear-gradient(135deg, #4b5563 0%, #1f2937 100%)' // Gray
  }
}

const move = keyframes`
  0% { transform: translate(-50%, -50%) scale(1); }
  100% { transform: translate(-50%, -50%) scale(1.1); }
`

const PhaseBackground = ({ phase }: { phase: TimerState['currentPhase'] }) => {
  const theme = useTheme()

  return (
    <AnimatePresence>
      <motion.div
        key={phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: getPhaseGradient(phase),
          zIndex: 0,
        }}
      >
        {particles.map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 200 + 100}px`,
              height: `${Math.random() * 200 + 100}px`,
              background: `radial-gradient(circle, ${
                theme.palette.background.default
              }20 0%, transparent 70%)`,
              borderRadius: '50%',
              animation: `${move} ${
                Math.random() * 10 + 5
              }s alternate infinite`,
              opacity: 0.5,
            }}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  )
}

export default memo(PhaseBackground)

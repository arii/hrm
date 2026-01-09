// File: components/TimerDisplay/PhaseBackground.tsx
'use client'
import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Box, useTheme } from '@mui/material'
import { TimerData } from '@/types/core'
import { keyframes } from '@emotion/react'
import { Theme } from '@mui/material/styles'

const getPhaseGradient = (phase: TimerData['currentPhase'], theme: Theme) => {
  switch (phase) {
    case 'PREPARE':
      return `linear-gradient(135deg, ${theme.palette.warning.light} 0%, ${theme.palette.warning.main} 100%)`
    case 'WORK':
      return `linear-gradient(135deg, ${theme.palette.error.light} 0%, ${theme.palette.error.main} 100%)`
    case 'REST':
      return `linear-gradient(135deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`
    case 'RUNNING':
      return `linear-gradient(135deg, ${theme.palette.info.light} 0%, ${theme.palette.info.main} 100%)`
    case 'IDLE':
    default:
      return `linear-gradient(135deg, ${theme.palette.grey[600]} 0%, ${theme.palette.grey[800]} 100%)`
  }
}

const move = keyframes`
  0% { transform: translate(-50%, -50%) scale(1); }
  100% { transform: translate(-50%, -50%) scale(1.1); }
`

const PhaseBackground = ({ phase }: { phase: TimerData['currentPhase'] }) => {
  const theme = useTheme()
  const [particles] = useState(() =>
    Array.from({ length: 20 }).map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      width: `${Math.random() * 200 + 100}px`,
      height: `${Math.random() * 200 + 100}px`,
      animationDuration: `${Math.random() * 10 + 5}s`,
    }))
  )

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
          background: getPhaseGradient(phase, theme),
          zIndex: 0,
        }}
      >
        {particles.map((style, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              top: style.top,
              left: style.left,
              width: style.width,
              height: style.height,
              background: `radial-gradient(circle, ${alpha(
                theme.palette.background.default,
                0.1
              )} 0%, transparent 70%)`,
              borderRadius: '50%',
              animation: `${move} ${style.animationDuration} alternate infinite`,
              opacity: 0.5,
            }}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  )
}

export default memo(PhaseBackground)

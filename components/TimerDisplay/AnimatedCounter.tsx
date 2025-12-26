// File: components/TimerDisplay/AnimatedCounter.tsx
'use client'
import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Typography } from '@mui/material'

const AnimatedCounter = ({
  displayTime,
  phaseColor,
}: {
  displayTime: string
  phaseColor: string
}) => {
  return (
    <Typography
      data-testid="timer-countdown"
      component="div"
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      sx={{
        fontFamily: 'var(--font-digital-7-mono)',
        fontSize: { xs: '6rem', sm: '8rem', md: '10rem' },
        fontWeight: 800,
        letterSpacing: '0.12rem',
        lineHeight: 1,
        color: phaseColor,
        textShadow: `0 0 20px ${phaseColor}80`,
        position: 'relative',
        width: '100%',
        minHeight: { xs: '6rem', sm: '8rem', md: '10rem' }, // Prevents layout shift
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={displayTime}
          initial={{ y: 50, opacity: 0, scale: 0.7 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -50, opacity: 0, scale: 0.7 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            duration: 0.5,
          }}
          style={{
            position: 'absolute',
          }}
        >
          {displayTime}
        </motion.div>
      </AnimatePresence>
    </Typography>
  )
}

export default memo(AnimatedCounter)

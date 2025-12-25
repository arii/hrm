// components/TimerDisplay/AnimatedCounter.tsx
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Typography } from '@mui/material'

const counterVariants = {
  enter: (direction: 'up' | 'down') => ({
    y: direction === 'up' ? 50 : -50,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: {
      y: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  },
  exit: (direction: 'up' | 'down') => ({
    y: direction === 'up' ? -50 : 50,
    opacity: 0,
    transition: {
      y: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  }),
}

const AnimatedCounter = ({
  time,
  direction,
}: {
  time: number
  direction: 'up' | 'down'
}) => {
  return (
    <div style={{ position: 'relative', height: '1.2em' }}>
      <AnimatePresence initial={false} custom={direction}>
        <Typography
          component={motion.div}
          key={time}
          variants={counterVariants}
          custom={direction}
          initial="enter"
          animate="center"
          exit="exit"
          sx={{
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '10rem',
            fontWeight: 700,
            color: 'white',
            textShadow: '0 0 20px rgba(0,0,0,0.1)',
            position: 'absolute',
            width: '100%',
            textAlign: 'center',
          }}
        >
          {time}
        </Typography>
      </AnimatePresence>
    </div>
  )
}

export default AnimatedCounter

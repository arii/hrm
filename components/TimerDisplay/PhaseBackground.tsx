// components/TimerDisplay/PhaseBackground.tsx
import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Box } from '@mui/material'

const particleVariants = {
  initial: {
    opacity: 0,
    scale: 0,
    x: 0,
    y: 0,
  },
  animate: (i: number) => ({
    opacity: [0, 0.3, 0],
    scale: [0, 1.5, 0],
    x: `${Math.random() * 200 - 100}vw`,
    y: `${Math.random() * 200 - 100}vh`,
    transition: {
      duration: Math.random() * 5 + 5,
      repeat: Infinity,
      repeatType: 'loop',
      delay: i * 0.3,
    },
  }),
}

const PhaseBackground = ({ phase }: { phase: 'prepare' | 'work' | 'rest' }) => {
  const particles = useMemo(() => Array.from({ length: 20 }), [])

  const gradients = {
    prepare: 'linear-gradient(135deg, #FFC371 0%, #FF5F6D 100%)',
    work: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)',
    rest: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  }

  return (
    <AnimatePresence>
      <Box
        component={motion.div}
        key={phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 1 } }}
        exit={{ opacity: 0, transition: { duration: 1 } }}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: gradients[phase],
          zIndex: -1,
        }}
      >
        {particles.map((_, i) => (
          <Box
            key={i}
            component={motion.div}
            variants={particleVariants}
            initial="initial"
            animate="animate"
            custom={i}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              filter: 'blur(20px)',
            }}
          />
        ))}
      </Box>
    </AnimatePresence>
  )
}

export default PhaseBackground

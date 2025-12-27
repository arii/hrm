// File: components/TimerDisplay/AnimatedCounter.tsx
'use client'
import { memo } from 'react'
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
        fontFamily: 'var(--font-digital-7-mono), monospace',
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
      <div
        style={{
          position: 'absolute',
        }}
      >
        {displayTime}
      </div>
    </Typography>
  )
}

export default memo(AnimatedCounter)

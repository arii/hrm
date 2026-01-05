// File: components/TimerDisplay/ProgressRing.tsx
'use client'
import { memo } from 'react'
import { CircularProgress, Box } from '@mui/material'

const ProgressRing = ({
  percentage,
  phaseColor,
}: {
  percentage: number
  phaseColor: string
}) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'clamp(200px, 80vw, 500px)',
        height: 'clamp(200px, 80vw, 500px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress
        variant="determinate"
        value={100}
        size="100%"
        thickness={2}
        sx={{
          position: 'absolute',
          color: 'rgba(255, 255, 255, 0.1)',
        }}
      />
      <CircularProgress
        variant="determinate"
        value={percentage}
        size="100%"
        thickness={2.5}
        sx={{
          color: phaseColor,
          strokeLinecap: 'round',
        }}
      />
    </Box>
  )
}

export default memo(ProgressRing)

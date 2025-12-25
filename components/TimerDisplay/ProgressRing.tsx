// components/TimerDisplay/ProgressRing.tsx
import React from 'react'
import { CircularProgress, Box, Typography } from '@mui/material'

const ProgressRing = ({
  progress,
  phase,
  phaseDuration,
}: {
  progress: number
  phase: string
  phaseDuration: number
}) => {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={300}
        thickness={2}
        sx={{
          color: 'rgba(255, 255, 255, 0.2)',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
      <CircularProgress
        variant="determinate"
        value={progress * 100}
        size={300}
        thickness={2}
        sx={{ color: 'white' }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="h6"
          component="div"
          color="white"
          sx={{ textTransform: 'uppercase', letterSpacing: '0.2em' }}
        >
          {phase}
        </Typography>
        <Typography variant="h4" component="div" color="white">
          {phaseDuration}s
        </Typography>
      </Box>
    </Box>
  )
}

export default ProgressRing

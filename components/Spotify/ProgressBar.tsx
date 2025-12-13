'use client'

import React from 'react'
import Box from '@mui/material/Box'
import Slider from '@mui/material/Slider'
import Typography from '@mui/material/Typography'

interface ProgressBarProps {
  progressMs: number
  durationMs: number
  onSeek: (positionMs: number) => void
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progressMs,
  durationMs,
  onSeek,
}) => {
  const handleChange = (_event: Event, newValue: number | number[]) => {
    onSeek(newValue as number)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {formatTime(progressMs)}
      </Typography>
      <Slider
        size="small"
        value={progressMs}
        max={durationMs}
        onChange={handleChange}
        aria-label="Track progress"
        sx={{
          color: 'common.white',
          height: 48, // Ensure the slider itself has enough height for the touch target
          '& .MuiSlider-thumb': {
            width: 12,
            height: 12,
            transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'transparent',
            },
            '&:hover, &.Mui-focusVisible': {
              boxShadow: (theme) =>
                `0px 0px 0px 8px ${theme.palette.action.hover}`,
            },
            '&.Mui-active': {
              width: 20,
              height: 20,
            },
          },
          '& .MuiSlider-rail': {
            opacity: 0.28,
          },
        }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {formatTime(durationMs)}
      </Typography>
    </Box>
  )
}

export default ProgressBar

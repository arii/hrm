'use client'

import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import { formatDuration } from '@/utils/time'

interface ProgressBarProps {
  progressMs: number
  durationMs: number
}

/**
 * @component ProgressBar
 * @description Displays the progress of the current Spotify track.
 */
export const ProgressBar = memo(({ progressMs, durationMs }: ProgressBarProps) => {
  const progress = durationMs > 0 ? (progressMs / durationMs) * 100 : 0

  return (
    <Box sx={{ width: '100%' }}>
      <LinearProgress
        variant="determinate"
        value={progress}
        aria-label="Track progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-valuetext={`${formatDuration(progressMs)} of ${formatDuration(
          durationMs
        )}`}
      />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {formatDuration(progressMs)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatDuration(durationMs)}
        </Typography>
      </Box>
    </Box>
  )
})

ProgressBar.displayName = 'ProgressBar'
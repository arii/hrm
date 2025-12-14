'use client'

import { useWebSocket } from '@/context/WebSocketContext'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import { formatDuration } from '@/utils/time'

/**
 * @component ProgressBar
 * @description Displays the progress of the current Spotify track.
 */
export const ProgressBar = memo(() => {
  const { spotifyData } = useWebSocket()
  const { progressMs = 0, durationMs = 0 } = spotifyData

  const progress = durationMs > 0 ? (progressMs / durationMs) * 100 : 0

  return (
    <Box sx={{ width: '100%' }}>
      <LinearProgress variant="determinate" value={progress} />
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
'use client'

import { useWebSocket } from '@/context/WebSocketContext'
import { Box, Typography } from '@mui/material'

/**
 * @function formatDuration
 * @description Formats a duration in seconds into a HH:MM:SS string.
 * @param {number} seconds - The duration in seconds.
 * @returns {string} The formatted duration string.
 */
const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const parts: string[] = []
  if (h > 0) {
    parts.push(String(h).padStart(2, '0'))
  }
  parts.push(String(m).padStart(2, '0'))
  parts.push(String(s).padStart(2, '0'))

  return parts.join(':')
}

/**
 * @component WorkoutTimer
 * @description A UI component that displays the elapsed time of an active workout session.
 * It subscribes to the global timer state and is only visible when a workout is running.
 */
const WorkoutTimer = () => {
  const { timerData } = useWebSocket()

  if (!timerData.isRunning) {
    return null
  }

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        textAlign: 'center',
      }}
    >
      <Typography variant="h6" component="h2" gutterBottom>
        Workout Duration
      </Typography>
      <Typography variant="h4" component="p" sx={{ fontFamily: 'monospace' }}>
        {formatDuration(timerData.timeElapsed)}
      </Typography>
    </Box>
  )
}

export default WorkoutTimer

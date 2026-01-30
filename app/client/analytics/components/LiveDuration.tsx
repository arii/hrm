// app/client/experimental/components/LiveDuration.tsx
'use client'
import { useState, useEffect } from 'react'
import { Typography } from '@mui/material'

interface LiveDurationProps {
  startTime: number
  endTime: number | null
}

/**
 * Displays a live-updating duration for an active session.
 * Isolated component to prevent unnecessary re-renders of parent list.
 */
const LiveDuration = ({ startTime, endTime }: LiveDurationProps) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    // Only run interval for active sessions (no endTime)
    if (endTime) return

    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [endTime])

  const durationMinutes = endTime
    ? (endTime - startTime) / 60000
    : (now - startTime) / 60000

  return (
    <Typography variant="body2">
      {durationMinutes.toFixed(1)} min
      {!endTime && ' (active)'}
    </Typography>
  )
}

export default LiveDuration

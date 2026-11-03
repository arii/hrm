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
  // Initialize from props so server and first client render match;
  // the real clock value is set after mount.
  const [now, setNow] = useState(startTime)

  useEffect(() => {
    // Only run interval for active sessions (no endTime)
    if (endTime) return

    // Seed the ticking clock subscription once after mount (SSR-safe init above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [endTime])

  const durationMinutes = endTime
    ? (endTime - startTime) / 60000
    : (now - startTime) / 60000

  return (
    <Typography variant="body2" component="span" sx={{ display: 'block' }}>
      {durationMinutes.toFixed(1)} min
      {!endTime && ' (active)'}
    </Typography>
  )
}

export default LiveDuration

// app/client/experimental/components/TimeSyncControls.tsx
'use client'
import { useState, useEffect } from 'react'
import { TextField, Button, Typography, Paper, Box } from '@mui/material'
import { WorkoutSessionData } from '@/lib/workout-session-storage'
import { formatTimestamp, formatDuration } from '@/lib/time'

interface TimeSyncControlsProps {
  session: WorkoutSessionData
  onTrim: (startTime: number, endTime: number) => void
}

const TimeSyncControls = ({ session, onTrim }: TimeSyncControlsProps) => {
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  useEffect(() => {
    if (session) {
      setTimeout(() => {
        setStartTime(formatTimestamp(session.startTime, 'HH:mm:ss'))
        setEndTime(
          session.endTime ? formatTimestamp(session.endTime, 'HH:mm:ss') : ''
        )
      }, 0)
    }
  }, [session.startTime, session.endTime, session])

  const handleApplyTrim = () => {
    // Basic validation and conversion from HH:mm:ss to timestamp
    const startDate = new Date(session.startTime)
    const startTimeParts = startTime.split(':').map((s) => parseInt(s, 10) || 0)
    const startH = startTimeParts[0] || 0
    const startM = startTimeParts[1] || 0
    const startS = startTimeParts[2] || 0
    startDate.setHours(startH, startM, startS, 0)

    const endDate = session.endTime ? new Date(session.endTime) : new Date()
    const endTimeParts = endTime.split(':').map((s) => parseInt(s, 10) || 0)
    const endH = endTimeParts[0] || 0
    const endM = endTimeParts[1] || 0
    const endS = endTimeParts[2] || 0
    endDate.setHours(endH, endM, endS, 0)

    onTrim(startDate.getTime(), endDate.getTime())
  }

  const sessionDuration = session.endTime
    ? (session.endTime - session.startTime) / 1000
    : 0

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Recording Window
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          alignItems: 'center',
        }}
      >
        <TextField
          label="Start Time"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          inputProps={{ step: 1 }}
        />
        <TextField
          label="End Time"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          inputProps={{ step: 1 }}
        />
        <Button
          variant="contained"
          onClick={handleApplyTrim}
          fullWidth
          disabled={!startTime || !endTime}
        >
          Apply
        </Button>
        <Typography variant="body2" align="center" sx={{ minWidth: '80px' }}>
          Duration: {formatDuration(sessionDuration)}
        </Typography>
      </Box>
    </Paper>
  )
}

export default TimeSyncControls

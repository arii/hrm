// components/AutoStartNotifier.tsx
'use client'
import React, { useState, useEffect } from 'react'
import {
  Snackbar,
  Alert,
  Button,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material'

interface AutoStartNotifierProps {
  isDetecting: boolean
  onConfirm: () => void
  onCancel: () => void
  countdownSeconds?: number
}

const AutoStartNotifier: React.FC<AutoStartNotifierProps> = ({
  isDetecting,
  onConfirm,
  onCancel,
  countdownSeconds = 10,
}) => {
  const [open, setOpen] = useState(false)
  const [countdown, setCountdown] = useState(countdownSeconds)

  useEffect(() => {
    if (isDetecting) {
      setOpen(true)
      setCountdown(countdownSeconds)
    } else {
      setOpen(false)
    }

    if (isDetecting && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (isDetecting && countdown === 0) {
      onConfirm()
      setOpen(false)
    }
  }, [isDetecting, countdown, countdownSeconds, onConfirm])

  const handleCancel = () => {
    onCancel()
    setOpen(false)
  }

  const progress = (countdown / countdownSeconds) * 100

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={handleCancel}>
            Cancel
          </Button>
        }
        sx={{ width: '100%' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ position: 'relative', display: 'inline-flex', mr: 2 }}>
            <CircularProgress variant="determinate" value={progress} />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="caption"
                component="div"
                color="text.secondary"
              >
                {countdown}
              </Typography>
            </Box>
          </Box>
          Sustained HR detected, session will start in {countdown} seconds.
        </Box>
      </Alert>
    </Snackbar>
  )
}

export default AutoStartNotifier

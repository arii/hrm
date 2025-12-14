// components/Toast/Toast.tsx
'use client'

import React from 'react'
import { Snackbar, Alert, AlertColor, SnackbarOrigin } from '@mui/material'

interface ToastProps {
  open: boolean
  message: string
  severity: AlertColor
  onClose: () => void
  duration?: number
  anchorOrigin?: SnackbarOrigin
}

const Toast: React.FC<ToastProps> = ({
  open,
  message,
  severity,
  onClose,
  duration = 6000,
  anchorOrigin = { vertical: 'bottom', horizontal: 'left' },
}) => {
  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return
    }
    onClose()
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={handleClose}
      anchorOrigin={anchorOrigin}
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        sx={{ width: '100%' }}
        variant="filled"
      >
        {message}
      </Alert>
    </Snackbar>
  )
}

export default Toast

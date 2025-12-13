'use client'

import React, { useState } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert, { AlertColor } from '@mui/material/Alert'
import { useTheme } from '@mui/material/styles'

interface ToastProps {
  id: number
  message: string
  severity: AlertColor
  duration?: number
  onClose: (id: number) => void
  index: number
}

const Toast: React.FC<ToastProps> = ({
  id,
  message,
  severity,
  duration = 6000,
  onClose,
  index,
}) => {
  const [open, setOpen] = useState(true)
  const theme = useTheme()

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return
    }
    setOpen(false)
  }

  // When the snackbar finishes its exit animation, call the onClose prop
  const handleExited = () => {
    onClose(id)
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={handleClose}
      TransitionProps={{ onExited: handleExited }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      style={{
        bottom: `${theme.spacing(2.5) + index * parseInt(theme.spacing(8.75))}`,
      }} // Stack toasts vertically
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}

export default Toast

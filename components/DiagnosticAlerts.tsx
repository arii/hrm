'use client'
// File: components/DiagnosticAlerts.tsx
import React, { useState, useEffect } from 'react'
import { Snackbar, Alert } from '@mui/material'
import { useWebSocket } from '@/context/WebSocketContext'
import { DiagnosticAlert } from '@/types/websocket'

const DiagnosticAlerts: React.FC = () => {
  const { lastDiagnosticAlert } = useWebSocket()
  const [open, setOpen] = useState(false)
  const [alert, setAlert] = useState<DiagnosticAlert | null>(null)

  useEffect(() => {
    if (lastDiagnosticAlert) {
      setAlert(lastDiagnosticAlert)
      setOpen(true)
    }
  }, [lastDiagnosticAlert])

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return
    }
    setOpen(false)
  }

  if (!alert) {
    return null
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        onClose={handleClose}
        severity={alert.severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        <strong>{alert.deviceName}:</strong> {alert.message}
      </Alert>
    </Snackbar>
  )
}

export default DiagnosticAlerts

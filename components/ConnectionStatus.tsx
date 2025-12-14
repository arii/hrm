'use client'
import { Alert, useTheme } from '@mui/material'
import React from 'react'
import { useWebSocket } from '../context/WebSocketContext'

export const ConnectionStatus: React.FC = () => {
  const { connectionStatus } = useWebSocket()
  const theme = useTheme()

  if (connectionStatus.status === 'connected') {
    return null // Don't show anything when connected
  }

  let message: React.ReactNode
  switch (connectionStatus.status) {
    case 'reconnecting':
      message = <>Reconnecting... (attempt {connectionStatus.attempt})</>
      break
    case 'failed':
      message = (
        <>Connection failed. Please check your network and refresh the page.</>
      )
      break
    case 'error':
      message = <>A connection error occurred.</>
      break
    default:
      message = <>Connection lost. Attempting to reconnect...</>
  }

  return (
    <Alert
      severity={
        connectionStatus.status === 'failed' ||
        connectionStatus.status === 'error'
          ? 'error'
          : 'warning'
      }
      sx={{
        position: 'fixed',
        top: theme.spacing(1),
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        minWidth: 300,
        textAlign: 'center',
      }}
    >
      {message}
    </Alert>
  )
}

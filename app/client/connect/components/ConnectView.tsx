'use client'
import React from 'react'
import {
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material'
import DeviceConnection from './DeviceConnection'
import UserSettingsForm from './UserSettingsForm'
import { useAutoConnect } from '@/hooks/useAutoConnect'
import { useHrmBroadcaster } from '@/hooks/useHrmBroadcaster'
import { useWebSocket } from '@/context/WebSocketContext'

const ConnectView: React.FC = () => {
  const { autoConnectStatus } = useAutoConnect()
  const { isBroadcasting } = useHrmBroadcaster()
  const { isConnected } = useWebSocket()

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Connection Status
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            WebSocket:{' '}
            {isConnected ? (
              <span style={{ color: 'green' }}>Connected</span>
            ) : (
              <span style={{ color: 'red' }}>Disconnected</span>
            )}
          </Typography>
          {!isConnected && <CircularProgress size={24} sx={{ ml: 2 }} />}
        </Box>

        {autoConnectStatus === 'connecting' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Attempting to auto-connect to your last device...
          </Alert>
        )}
        {autoConnectStatus === 'success' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully auto-connected!
          </Alert>
        )}
        {autoConnectStatus === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Auto-connect failed. Please connect manually.
          </Alert>
        )}

        {isBroadcasting && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Broadcasting HRM data...
          </Alert>
        )}

        <DeviceConnection />
        <UserSettingsForm />
      </Box>
    </Container>
  )
}

export default ConnectView

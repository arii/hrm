'use client'
import React from 'react'
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
} from '@mui/material'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'

const DeviceConnection: React.FC = () => {
  const { status, device, connect, disconnect, error } = useBluetoothHRM()

  const handleConnect = () => {
    connect()
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Device Connection
      </Typography>
      <Box>
        <Typography>
          Status: <strong>{status}</strong>
        </Typography>
        {device && (
          <Typography>
            Device: <strong>{device.name}</strong>
          </Typography>
        )}
        {error && (
          <Typography color="error">
            Error: <strong>{error}</strong>
          </Typography>
        )}
      </Box>
      <Box sx={{ mt: 2 }}>
        {status === 'DISCONNECTED' ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleConnect}
          >
            Connect to HRM Device
          </Button>
        ) : (
          <Button
            variant="contained"
            color="secondary"
            onClick={disconnect}
          >
            Disconnect
          </Button>
        )}
        {status === 'CONNECTING' && <CircularProgress size={24} sx={{ ml: 2 }} />}
      </Box>
    </Paper>
  )
}

export default DeviceConnection

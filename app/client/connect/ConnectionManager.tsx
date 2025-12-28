// app/client/connect/ConnectionManager.tsx
'use client'

import React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull'
import BatteryFullIcon from '@mui/icons-material/BatteryFull'
import BatteryStdIcon from '@mui/icons-material/BatteryStd'
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert'

interface ConnectionManagerProps {
  onConnect: () => void
  onDisconnect: () => void
  isConnected: boolean
  deviceStatus: string
  batteryLevel: number | null
  isConnectable: boolean
}

const getBatteryIcon = (level: number) => {
  if (level > 90) return <BatteryFullIcon color="success" />
  if (level > 50) return <BatteryChargingFullIcon color="action" />
  if (level > 20) return <BatteryStdIcon color="warning" />
  return <BatteryAlertIcon color="error" />
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  onConnect,
  onDisconnect,
  isConnected,
  deviceStatus,
  batteryLevel,
  isConnectable,
}) => {
  const hasBattery = typeof batteryLevel === 'number'

  return (
    <Box sx={{ textAlign: 'center', mb: 3 }}>
      {deviceStatus && !isConnected && !deviceStatus.includes('Disconnected') && (
        <Alert
          severity={deviceStatus.includes('Failed') ? 'error' : 'info'}
          sx={{ mb: 2 }}
        >
          {deviceStatus}
        </Alert>
      )}

      {!isConnected ? (
        <Button
          variant="contained"
          size="large"
          onClick={onConnect}
          disabled={!isConnectable || deviceStatus.includes('Connecting')}
        >
          {deviceStatus.includes('Connecting') ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={20} color="inherit" />
              <span>Connecting...</span>
            </Stack>
          ) : (
            'Connect Bluetooth HRM'
          )}
        </Button>
      ) : (
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {hasBattery && (
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{ color: 'text.secondary' }}
              >
                {getBatteryIcon(batteryLevel)}
                <Typography variant="body2">{batteryLevel}% Battery</Typography>
              </Stack>
            )}
          </Box>
          <Button
            variant="outlined"
            size="large"
            onClick={onDisconnect}
            color="error"
          >
            Disconnect
          </Button>
          {deviceStatus !== 'Connected' && (
            <Typography variant="caption" color="text.secondary">
              Status: {deviceStatus}
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  )
}

export default ConnectionManager

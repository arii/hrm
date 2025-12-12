// File: components/HRMConnectionManager.tsx
'use client'

import React from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import ConnectHRMonitor from './ConnectHRMonitor'
import HRMonitorStatusIndicator from './HRMonitorStatusIndicator'

const HRMConnectionManager: React.FC = () => {
  const { connectAndStream, disconnect, hrmState, batteryLevel } =
    useBluetoothHRM()

  // Handler to initiate connection. For now, we'll pass undefined for name and age.
  // This could be enhanced later with a user profile.
  const handleConnect = () => {
    // These arguments can be sourced from a user context or form in a future enhancement
    connectAndStream(undefined, undefined)
  }

  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing(4),
        border: `2px dashed ${theme.palette.grey[400]}`,
        borderRadius: theme.shape.borderRadius * 2,
        textAlign: 'center',
        minHeight: 220, // Match the skeleton height for consistency
      })}
    >
      <Stack spacing={3} alignItems="center">
        <Typography variant="h6" color="text.secondary">
          No Active Heart Rate Monitors
        </Typography>
        <ConnectHRMonitor
          status={hrmState.status}
          connect={handleConnect}
          disconnect={disconnect}
        />
        <HRMonitorStatusIndicator
          state={hrmState}
          batteryLevel={batteryLevel}
        />
      </Stack>
    </Box>
  )
}

export default HRMConnectionManager

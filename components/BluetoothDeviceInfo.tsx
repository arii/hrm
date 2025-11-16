// components/BluetoothDeviceInfo.tsx
'use client'

import { Box, Typography } from '@mui/material'
import { useBluetoothHRMContext } from '../contexts/BluetoothHRMContext'

interface BluetoothDeviceInfoProps {
  /** Optional override for showing when not connected yet. Default: require deviceName or batteryLevel */
  alwaysShow?: boolean
  /** Add a data-testid for easier automated selection */
  'data-testid'?: string
}

/**
 * Renders device metadata (name + battery) for the connected Bluetooth HRM.
 * Encapsulates styling and conditional display logic so pages stay lean.
 */
export default function BluetoothDeviceInfo({
  alwaysShow = false,
  'data-testid': testId = 'bt-device-info',
}: BluetoothDeviceInfoProps) {
  const { deviceName, batteryLevel, isConnected } = useBluetoothHRMContext()

  const shouldRender =
    alwaysShow || (isConnected && (deviceName || batteryLevel !== null))
  if (!shouldRender) return null

  return (
    <Box
      data-testid={testId}
      sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}
    >
      {deviceName && (
        <Typography variant="body1" sx={{ mb: 1 }} data-testid="bt-device-name">
          <strong>Device:</strong> {deviceName}
        </Typography>
      )}
      {batteryLevel !== null && (
        <Typography variant="body1" data-testid="bt-device-battery">
          <strong>Battery:</strong> {batteryLevel}%
        </Typography>
      )}
    </Box>
  )
}

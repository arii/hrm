// File: components/ConnectHRMonitorButton.tsx
'use client'
import { memo } from 'react'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import BluetoothIcon from '@mui/icons-material/Bluetooth'
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled'
import CircularProgress from '@mui/material/CircularProgress'
import {
  BLUETOOTH_NOT_SUPPORTED_TEXT,
  CONNECT_HR_MONITOR_BUTTON_TEXT,
  DISCONNECT_HR_MONITOR_BUTTON_TEXT,
  UNSUPPORTED_BLUETOOTH_TOOLTIP,
} from '@/utils/constants'

interface ConnectHRMonitorButtonProps {
  connect: () => void
  disconnect: () => void
  isConnected: boolean
  isSupported: boolean
  deviceStatus: string
}

const ConnectHRMonitorButton = ({
  connect,
  disconnect,
  isConnected,
  isSupported,
  deviceStatus,
}: ConnectHRMonitorButtonProps) => {
  const lowerCaseStatus = deviceStatus.toLowerCase()
  const isConnecting =
    lowerCaseStatus.includes('connecting') ||
    lowerCaseStatus.includes('scanning') ||
    lowerCaseStatus.includes('checking')

  if (!isSupported) {
    return (
      <Tooltip title={UNSUPPORTED_BLUETOOTH_TOOLTIP}>
        <Box>
          <Button
            variant="contained"
            disabled
            startIcon={<BluetoothDisabledIcon />}
            fullWidth
            size="large"
          >
            {BLUETOOTH_NOT_SUPPORTED_TEXT}
          </Button>
        </Box>
      </Tooltip>
    )
  }

  return isConnected ? (
    <Button
      variant="outlined"
      color="error"
      onClick={disconnect}
      startIcon={<BluetoothDisabledIcon />}
      aria-label="Disconnect Heart Rate Monitor"
      fullWidth
      size="large"
    >
      {DISCONNECT_HR_MONITOR_BUTTON_TEXT}
    </Button>
  ) : (
    <Button
      variant="contained"
      color="primary"
      onClick={connect}
      startIcon={
        isConnecting ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          <BluetoothIcon />
        )
      }
      aria-label="Connect Heart Rate Monitor"
      fullWidth
      size="large"
      disabled={isConnecting}
    >
      {isConnecting ? 'Connecting...' : CONNECT_HR_MONITOR_BUTTON_TEXT}
    </Button>
  )
}

export default memo(ConnectHRMonitorButton)

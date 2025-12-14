// File: components/ConnectHRMonitorButton.tsx
'use client'
import { memo } from 'react'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import BluetoothIcon from '@mui/icons-material/Bluetooth'
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled'
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
}

const ConnectHRMonitorButton = ({
  connect,
  disconnect,
  isConnected,
  isSupported,
}: ConnectHRMonitorButtonProps) => {
  if (!isSupported) {
    return (
      <Tooltip title={UNSUPPORTED_BLUETOOTH_TOOLTIP}>
        <Box>
          <Button
            variant="contained"
            disabled
            startIcon={<BluetoothDisabledIcon />}
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
      color="secondary"
      onClick={disconnect}
      startIcon={<BluetoothDisabledIcon />}
      aria-label="Disconnect Heart Rate Monitor"
      sx={{ minHeight: '48px' }}
    >
      {DISCONNECT_HR_MONITOR_BUTTON_TEXT}
    </Button>
  ) : (
    <Button
      variant="contained"
      color="primary"
      onClick={connect}
      startIcon={<BluetoothIcon />}
      aria-label="Connect Heart Rate Monitor"
      sx={{ minHeight: '48px' }}
    >
      {CONNECT_HR_MONITOR_BUTTON_TEXT}
    </Button>
  )
}

export default memo(ConnectHRMonitorButton)

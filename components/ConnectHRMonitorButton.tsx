// File: components/ConnectHRMonitorButton.tsx
'use client'
import { memo } from 'react'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import BluetoothIcon from '@mui/icons-material/Bluetooth'
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled'

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
      <Tooltip title="This browser does not support Web Bluetooth. Please use Chrome, Edge, or Opera.">
        <Box>
          <Button
            variant="contained"
            disabled
            startIcon={<BluetoothDisabledIcon />}
          >
            Bluetooth Not Supported
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
    >
      Disconnect HR Monitor
    </Button>
  ) : (
    <Button
      variant="contained"
      color="primary"
      onClick={connect}
      startIcon={<BluetoothIcon />}
    >
      Connect HR Monitor
    </Button>
  )
}

export default memo(ConnectHRMonitorButton)

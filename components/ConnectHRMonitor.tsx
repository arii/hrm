// File: components/ConnectHRMonitor.tsx
import React from 'react'
import Button from '@mui/material/Button'
import BluetoothIcon from '@mui/icons-material/Bluetooth'
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled'

interface ConnectHRMonitorProps {
  isConnected: boolean
  connect: () => void
  disconnect: () => void
}

const ConnectHRMonitor: React.FC<ConnectHRMonitorProps> = ({
  isConnected,
  connect,
  disconnect,
}) => {
  const handleConnect = () => {
    if (!isConnected) {
      connect()
    } else {
      disconnect()
    }
  }

  return (
    <Button
      variant="contained"
      color={isConnected ? 'error' : 'primary'}
      onClick={handleConnect}
      startIcon={isConnected ? <BluetoothDisabledIcon /> : <BluetoothIcon />}
      sx={{
        fontSize: '1.1rem',
        padding: '12px 24px',
      }}
    >
      {isConnected ? 'Disconnect HR Monitor' : 'Connect HR Monitor'}
    </Button>
  )
}

export default ConnectHRMonitor

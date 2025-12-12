// File: components/ConnectHRMonitor.tsx
import React from 'react'
import Button from '@mui/material/Button'
import BluetoothIcon from '@mui/icons-material/Bluetooth'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import CircularProgress from '@mui/material/CircularProgress'
import { HRMStatus } from '@/hooks/useBluetoothHRM'

interface ConnectHRMonitorProps {
  status: HRMStatus
  connect: () => void
  disconnect: () => void
}

const ConnectHRMonitor: React.FC<ConnectHRMonitorProps> = ({
  status,
  connect,
  disconnect,
}) => {
  const isConnected = status === 'CONNECTED'
  const isConnecting = status === 'SEARCHING' || status === 'CONNECTING'

  const handleConnect = () => {
    if (!isConnected) {
      connect()
    } else {
      disconnect()
    }
  }

  const getButtonContent = () => {
    if (isConnecting) {
      return (
        <>
          <CircularProgress size={24} sx={{ color: 'inherit', mr: 1 }} />
          Connecting...
        </>
      )
    }
    if (isConnected) {
      return (
        <>
          <LinkOffIcon sx={{ mr: 1 }} />
          Disconnect HR Monitor
        </>
      )
    }
    return (
      <>
        <BluetoothIcon sx={{ mr: 1 }} />
        Connect HR Monitor
      </>
    )
  }

  return (
    <Button
      variant="contained"
      size="large"
      color={isConnected ? 'error' : 'primary'}
      onClick={handleConnect}
      disabled={isConnecting}
      sx={(theme) => ({
        padding: theme.spacing(1.5, 3),
        minWidth: '280px',
      })}
    >
      {getButtonContent()}
    </Button>
  )
}

export default ConnectHRMonitor

// @ts-nocheck
'use client'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import {
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
} from '@mui/material'

const HrmConnectionPanel = () => {
  const {
    device,
    heartRate,
    error,
    status,
    connect,
    disconnect,
  } = useBluetoothHRM()

  return (
    <Card>
      <CardContent>
        <Typography variant="h5">Bluetooth HRM</Typography>
        <Typography>Status: {status}</Typography>
        {status === 'connecting' && <LinearProgress />}
        {error && <Typography color="error">Error: {error.message}</Typography>}
        {device && <Typography>Device: {device.name}</Typography>}
        {heartRate > 0 && <Typography>Heart Rate: {heartRate}</Typography>}
        <Button
          onClick={connect}
          disabled={status === 'connecting'}
          variant="contained"
        >
          Connect
        </Button>
        <Button
          onClick={disconnect}
          disabled={status !== 'connected'}
          variant="outlined"
        >
          Disconnect
        </Button>
      </CardContent>
    </Card>
  )
}

export default HrmConnectionPanel

import { Box, Button, CircularProgress, Link, Typography } from '@mui/material'
import {
  Bluetooth,
  CheckCircle,
  Error,
  Link as LinkIcon,
} from '@mui/icons-material'

interface DeviceConnectionProps {
  status: string
  deviceName: string | null
  error: string | null
  connect: () => void
  disconnect: () => void
}

export const DeviceConnection: React.FC<DeviceConnectionProps> = ({
  status,
  deviceName,
  error,
  connect,
  disconnect,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle color="success" sx={{ fontSize: 40 }} />
      case 'CONNECTING':
      case 'WAITING_FOR_HR':
        return <CircularProgress />
      case 'ERROR':
        return <Error color="error" sx={{ fontSize: 40 }} />
      default:
        return <Bluetooth sx={{ fontSize: 40 }} />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'CONNECTED':
        return `Connected to ${deviceName}`
      case 'CONNECTING':
        return 'Connecting...'
      case 'WAITING_FOR_HR':
        return 'Waiting for Heart Rate data...'
      case 'ERROR':
        return `Error: ${error}`
      default:
        return 'Disconnected'
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      {getStatusIcon()}
      <Typography variant="h6">{getStatusText()}</Typography>
      {status === 'CONNECTED' ? (
        <Button
          variant="contained"
          color="secondary"
          onClick={disconnect}
          startIcon={<Bluetooth />}
        >
          Disconnect
        </Button>
      ) : (
        <Button
          variant="contained"
          color="primary"
          onClick={connect}
          disabled={status === 'CONNECTING' || status === 'WAITING_FOR_HR'}
          startIcon={<Bluetooth />}
        >
          Connect HRM
        </Button>
      )}
      <Typography variant="body2" sx={{ textAlign: 'center' }}>
        Need help? Check out the{' '}
        <Link
          href="https://github.com/ari-anders/hrm/wiki/Connecting-a-Heart-Rate-Monitor"
          target="_blank"
          rel="noopener"
        >
          <LinkIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} />
          HRM Connection Guide
        </Link>
      </Typography>
    </Box>
  )
}

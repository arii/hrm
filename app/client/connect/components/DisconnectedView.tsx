// app/client/connect/components/DisconnectedView.tsx
import { Alert, Box, Button, TextField, Typography } from '@mui/material'
import ResetButton from './ResetButton'

interface DisconnectedViewProps {
  userName: string
  userAge: string
  onUserNameChange: (name: string) => void
  onUserAgeChange: (age: string) => void
  onConnect: () => void
  onForgetDevice: () => void
  isAutoConnecting: boolean
  autoConnectAttempts: number
  deviceStatus: string
  connectionStatus: string
}

const DisconnectedView = ({
  userName,
  userAge,
  onUserNameChange,
  onUserAgeChange,
  onConnect,
  onForgetDevice,
  isAutoConnecting,
  autoConnectAttempts,
  deviceStatus,
  connectionStatus,
}: DisconnectedViewProps) => {
  return (
    <Box sx={{ mt: 4 }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        align="center"
        fontWeight="bold"
      >
        Connect Device
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        align="center"
        sx={{ mb: 4 }}
      >
        Enter your details to calculate accurate heart rate zones.
      </Typography>

      {!deviceStatus.startsWith('Connecting') && (
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mb: 2 }}
        >
          Make sure your HRM is <strong>on</strong> and{' '}
          <strong>not connected</strong> to another phone or computer.
        </Typography>
      )}

      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          label="Athlete Name"
          variant="outlined"
          value={userName}
          onChange={(e) => onUserNameChange(e.target.value)}
          sx={{ mb: 3 }}
        />
        <TextField
          fullWidth
          label="Age"
          type="number"
          variant="outlined"
          value={userAge}
          onChange={(e) => onUserAgeChange(e.target.value)}
          inputProps={{ min: 1, max: 120 }}
        />
      </Box>
      {isAutoConnecting && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Attempting to auto-reconnect... (Attempt: {autoConnectAttempts})
        </Alert>
      )}
      {deviceStatus.includes('Failed') && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {deviceStatus}
        </Alert>
      )}

      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={onConnect}
        disabled={!userName.trim() || !userAge.trim() || isAutoConnecting}
        sx={{ py: 2, fontSize: '1.1rem' }}
      >
        {isAutoConnecting ? 'Connecting...' : 'Connect Bluetooth HRM'}
      </Button>
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <ResetButton />
        <Button
          variant="outlined"
          color="warning"
          fullWidth
          onClick={onForgetDevice}
        >
          Forget Bluetooth Device
        </Button>
      </Box>
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Server Status: {connectionStatus}
        </Typography>
      </Box>
    </Box>
  )
}

export default DisconnectedView

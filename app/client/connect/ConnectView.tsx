import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull'
import BatteryFullIcon from '@mui/icons-material/BatteryFull'
import BatteryStdIcon from '@mui/icons-material/BatteryStd'
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert'
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled'
import HrTile from '../../../components/HrTile'
import BottomNavBar from '../../../components/BottomNavBar'
import WorkoutSummary from './WorkoutSummary'
import { useState } from 'react'

interface ConnectViewProps {
  duration: string
  caloriesBurned: number
  userName: string
  setUserName: (name: string) => void
  userAge: string
  setUserAge: (age: string) => void
  isConnected: boolean
  deviceStatus: string
  batteryLevel: number | null
  onConnect: () => void
  onDisconnect: () => void
  onForgetDevice: () => Promise<void>
  isSupported: boolean
  currentHR: number
  hrZoneProps: { percentage: number; progressColor: string }
  connectionStatus: string
  bluetoothConnected: boolean
  hasStarted: boolean
  onReset: () => void
  workoutStatus: 'idle' | 'running' | 'paused'
  onStartWorkout: () => void
  onEndWorkout: () => void
  allowAutoStart: boolean
  onToggleAutoStart: () => void
}

export default function ConnectView({
  duration,
  caloriesBurned,
  userName,
  setUserName,
  userAge,
  setUserAge,
  isConnected,
  deviceStatus,
  batteryLevel,
  onConnect,
  onDisconnect,
  onForgetDevice,
  isSupported,
  currentHR,
  hrZoneProps,
  connectionStatus,
  bluetoothConnected,
  hasStarted,
  onReset,
  workoutStatus,
  onStartWorkout,
  onEndWorkout,
  allowAutoStart,
  onToggleAutoStart,
}: ConnectViewProps) {
  const [isResetting, setIsResetting] = useState(false)

  const getBatteryIcon = (level: number) => {
    if (level > 90) return <BatteryFullIcon color="success" />
    if (level > 50) return <BatteryChargingFullIcon color="action" />
    if (level > 20) return <BatteryStdIcon color="warning" />
    return <BatteryAlertIcon color="error" />
  }

  const handleFullReset = async () => {
    setIsResetting(true)
    try {
      await onForgetDevice()
      onReset()
    } catch (error) {
      console.error('Reset failed:', error)
    } finally {
      setIsResetting(false)
    }
  }

  if (!isSupported) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
        <BluetoothDisabledIcon
          sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }}
        />
        <Typography variant="h5" gutterBottom>
          Bluetooth Not Supported
        </Typography>
        <Alert severity="warning" sx={{ mt: 2 }}>
          Your browser does not support Web Bluetooth. Please use Google Chrome,
          Edge, or Bluefy (on iOS).
        </Alert>
        <BottomNavBar />
      </Container>
    )
  }

  const showUserDetails = hasStarted || isConnected

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Connect Heart Rate Monitor
        </Typography>

        {!showUserDetails ? (
          <Stack spacing={2} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Your Name"
              placeholder="e.g., Jane Doe"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <TextField
              fullWidth
              label="Your Age"
              placeholder="e.g., 30"
              type="number"
              value={userAge}
              onChange={(e) => setUserAge(e.target.value)}
              inputProps={{ min: 1, max: 120 }}
            />
          </Stack>
        ) : (
          <Box
            sx={{
              mb: 3,
              textAlign: 'center',
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 1,
            }}
          >
            <Typography variant="subtitle1" color="text.secondary">
              Connected as
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {userName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Age: {userAge}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={allowAutoStart}
                onChange={onToggleAutoStart}
                name="autoStartSwitch"
              />
            }
            label="Auto-start Workout on Connect"
          />
        </Box>

        {deviceStatus &&
          !isConnected &&
          !deviceStatus.includes('Disconnected') && (
            <Alert
              severity={deviceStatus.includes('Failed') ? 'error' : 'info'}
              sx={{ mb: 2 }}
            >
              {deviceStatus}
            </Alert>
          )}

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {!isConnected ? (
            <Button
              variant="contained"
              size="large"
              onClick={onConnect}
              disabled={
                !userName.trim() ||
                !userAge.trim() ||
                deviceStatus.includes('Connecting')
              }
            >
              {deviceStatus.includes('Connecting') ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={20} color="inherit" />
                  <span>Connecting...</span>
                </Stack>
              ) : (
                'Connect Bluetooth HRM'
              )}
            </Button>
          ) : (
            <Stack spacing={2}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {batteryLevel !== null && (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{ color: 'text.secondary' }}
                  >
                    {getBatteryIcon(batteryLevel)}
                    <Typography variant="body2">
                      {batteryLevel}% Battery
                    </Typography>
                  </Stack>
                )}
              </Box>
              <Button
                variant="outlined"
                size="large"
                onClick={onDisconnect}
                color="error"
              >
                Disconnect
              </Button>
              {deviceStatus !== 'Connected' && (
                <Typography variant="caption" color="text.secondary">
                  Status: {deviceStatus}
                </Typography>
              )}
            </Stack>
          )}
        </Box>

        {isConnected && bluetoothConnected && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Connected! Heart rate data is being streamed.
          </Alert>
        )}

        {hasStarted && !isConnected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Device Disconnected - Workout Paused
          </Alert>
        )}

        {isConnected && currentHR > 0 && (
          <Box sx={{ mt: 2 }}>
            <HrTile
              name={userName}
              bpm={currentHR}
              percentMax={hrZoneProps.percentage}
              isAlerting={false}
            />
          </Box>
        )}

        <Stack
          spacing={2}
          sx={{
            mt: 3,
            mb: 3,
            alignItems: 'center',
            minHeight: '48px', // Ensure consistent height for layout stability
          }}
        >
          {workoutStatus === 'idle' && isConnected && (
            <Button
              variant="contained"
              onClick={onStartWorkout}
              size="large"
              sx={{ minWidth: '200px' }}
              aria-label="Start workout session"
            >
              Start Workout
            </Button>
          )}
          {workoutStatus === 'paused' && (
            <>
              <Button
                variant="contained"
                onClick={onStartWorkout}
                size="large"
                sx={{ minWidth: '200px' }}
                disabled={!isConnected}
                aria-label="Resume workout session"
              >
                Resume Workout
              </Button>
              <Button
                variant="outlined"
                onClick={onEndWorkout}
                size="large"
                sx={{ minWidth: '200px' }}
                aria-label="End workout session"
              >
                End Workout
              </Button>
            </>
          )}
          {workoutStatus === 'running' && (
            <Button
              variant="outlined"
              onClick={onEndWorkout}
              size="large"
              sx={{ minWidth: '200px' }}
              aria-label="End workout session"
            >
              End Workout
            </Button>
          )}
        </Stack>

        {hasStarted && (
          <WorkoutSummary duration={duration} caloriesBurned={caloriesBurned} />
        )}

        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 2 }}
        >
          WebSocket: {connectionStatus}
        </Typography>

        <Box
          sx={{
            textAlign: 'center',
            mt: 4,
            pt: 4,
            borderTop: '1px solid #eee',
          }}
        >
          <Button
            variant="contained"
            color="error"
            onClick={handleFullReset}
            disabled={isResetting || !hasStarted}
          >
            {isResetting ? 'Resetting...' : 'Reset System & Device'}
          </Button>
          <Typography
            variant="caption"
            display="block"
            sx={{ mt: 1, color: 'text.secondary' }}
          >
            Resets server state AND forgets Bluetooth device connection.
          </Typography>
        </Box>
      </Container>
      <BottomNavBar />
    </>
  )
}

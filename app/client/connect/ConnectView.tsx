import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull'
import BatteryFullIcon from '@mui/icons-material/BatteryFull'
import BatteryStdIcon from '@mui/icons-material/BatteryStd'
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert'
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled'
import HrTile from '../../../components/HrTile'
import BottomNavBar from '../../../components/BottomNavBar'
import WorkoutSummary from './WorkoutSummary'
import UserSettings from './UserSettings'
import { SignalQualityIndicator } from './SignalQualityIndicator'
import WorkoutControls from './WorkoutControls'
import ResetSection from './components/ResetSection'
import { useState, useEffect } from 'react'
import logger from '@/utils/logger'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-reconnection'
import { WorkoutStatus } from '../../../types/workout'
import { UserProfileState, HrZoneData } from '@/types/connect'
import { BluetoothConnectionStatus } from '@/types/bluetooth'

interface ConnectViewProps {
  duration: string
  caloriesBurned: number
  userProfile: UserProfileState
  isConnected: boolean
  bluetoothStatus: BluetoothConnectionStatus
  isDataStale?: boolean
  deviceStatus: string
  batteryLevel: number | null
  onConnect: () => void
  onDisconnect: () => void
  onForgetDevice: () => Promise<void>
  isSupported: boolean
  signalPeriodMs: number
  currentHR: number
  hrZoneData: HrZoneData
  connectionStatus: string
  bluetoothConnected: boolean
  hasStarted: boolean
  onReset: () => void
  workoutStatus: WorkoutStatus
  onStartWorkout: () => void
  onPauseWorkout: () => void
  onEndWorkout: () => void
}

export default function ConnectView({
  duration,
  caloriesBurned,
  userProfile,
  isConnected,
  bluetoothStatus,
  isDataStale = false,
  deviceStatus,
  batteryLevel,
  onConnect,
  onDisconnect,
  onForgetDevice,
  isSupported,
  signalPeriodMs,
  currentHR,
  hrZoneData,
  connectionStatus,
  bluetoothConnected,
  hasStarted,
  onReset,
  workoutStatus,
  onStartWorkout,
  onPauseWorkout,
  onEndWorkout,
}: ConnectViewProps) {
  const [isResetting, setIsResetting] = useState(false)
  const { data } = userProfile

  const isConnecting =
    bluetoothStatus === BluetoothConnectionStatus.CONNECTING ||
    bluetoothStatus === BluetoothConnectionStatus.RECONNECTING
  const isDisconnecting =
    bluetoothStatus === BluetoothConnectionStatus.DISCONNECTING
  const isReSyncNeeded = bluetoothStatus === BluetoothConnectionStatus.ERROR

  useEffect(() => {
    if (isConnected) {
      logger.debug(
        { currentHR, isDataStale, userName: data.userName },
        'HrTile rendering with currentHR'
      )
    }
  }, [currentHR, isConnected, isDataStale, data.userName])

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
        <ResetSection onReset={handleFullReset} isResetting={isResetting} />
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
          <UserSettings profile={userProfile} />
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
              {data.userName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Age: {data.userAge}
            </Typography>
          </Box>
        )}

        {deviceStatus &&
          !isConnected &&
          (bluetoothStatus !== BluetoothConnectionStatus.DISCONNECTED ||
            deviceStatus !== BLUETOOTH_MESSAGES.disconnected) && (
            <Alert
              data-testid="connection-status-alert"
              severity={
                bluetoothStatus === BluetoothConnectionStatus.ERROR ||
                deviceStatus.toLowerCase().includes('failed')
                  ? 'error'
                  : 'info'
              }
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
                !data.userName.trim() ||
                !data.userAge.trim() ||
                isConnecting ||
                isDisconnecting
              }
            >
              {isConnecting ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={20} color="inherit" />
                  <span>Connecting...</span>
                </Stack>
              ) : isDisconnecting ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={20} color="inherit" />
                  <span>Disconnecting...</span>
                </Stack>
              ) : isReSyncNeeded ? (
                'Re-sync Sensor'
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
                <SignalQualityIndicator
                  periodMs={signalPeriodMs}
                  isConnected={isConnected}
                />
              </Box>
              <Button
                variant="outlined"
                size="large"
                onClick={onDisconnect}
                color="error"
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={20} color="inherit" />
                    <span>Disconnecting...</span>
                  </Stack>
                ) : (
                  'Disconnect'
                )}
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

        {isConnected && (
          <Box sx={{ mt: 2 }} data-testid="hr-tile">
            <HrTile
              name={data.userName}
              value={currentHR}
              percentage={hrZoneData.percentage}
              zone={hrZoneData.zone}
              calories={caloriesBurned}
              isDataStale={isDataStale}
            />
          </Box>
        )}

        <WorkoutControls
          workoutStatus={workoutStatus}
          isConnected={isConnected}
          onStart={onStartWorkout}
          onPause={onPauseWorkout}
          onEnd={onEndWorkout}
          onResume={onStartWorkout}
        />

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

        <ResetSection onReset={handleFullReset} isResetting={isResetting} />
      </Container>
      <BottomNavBar />
    </>
  )
}

'use client'
import { Container, Typography, Box, Button, Grid } from '@mui/material'
import {
  Bluetooth as BluetoothIcon,
  BluetoothConnected as BluetoothConnectedIcon,
  BluetoothDisabled as BluetoothDisabledIcon,
} from '@mui/icons-material'
import UserSettings from './UserSettings'
import HrTileWithCalories from '@/components/HrTileWithCalories'
import { SessionStatus as WorkoutStatus } from '@/hooks/useWorkoutSession'
import { MeasurementSystem, Gender } from '../../../types/core'
import PerformanceDashboard from './PerformanceDashboard'
import { HrZoneDuration } from '@/hooks/useHrZoneTracker'

interface ConnectViewProps {
  duration: string
  caloriesBurned: number
  userName: string | null
  setUserName: (name: string) => void
  userAge: string
  setUserAge: (age: string) => void
  onAgeBlur: () => void
  ageError: string | null
  userHeight: { cm: string; feet: string; inches: string }
  setUserHeight: (
    height: Partial<{ cm: string; feet: string; inches: string }>
  ) => void
  onHeightBlur: () => void
  heightError: string | null
  userWeight: string
  setUserWeight: (weight: string) => void
  onWeightBlur: () => void
  weightError: string | null
  gender: Gender | null
  setGender: (gender: Gender) => void
  unitSystem: MeasurementSystem
  onUnitChange: (unit: MeasurementSystem) => void
  isConnected: boolean
  deviceStatus: string
  batteryLevel: number | null
  onConnect: () => void
  onDisconnect: () => void
  onForgetDevice: () => Promise<void>
  isSupported: boolean
  currentHR: number
  hrZoneProps: {
    percentage: number
    progressColor: string
  }
  connectionStatus: string
  bluetoothConnected: boolean
  hasStarted: boolean
  onReset: () => void
  workoutStatus: WorkoutStatus
  onStartWorkout: () => void
  onEndWorkout: () => void
  hrHistory: { time: number; hr: number }[]
  setHrHistory: React.Dispatch<
    React.SetStateAction<{ time: number; hr: number }[]>
  >
  zoneDurations: HrZoneDuration[]
}

const ConnectView = (props: ConnectViewProps) => {
  const {
    caloriesBurned,
    userName,
    setUserName,
    userAge,
    setUserAge,
    onAgeBlur,
    ageError,
    userHeight,
    setUserHeight,
    onHeightBlur,
    heightError,
    userWeight,
    setUserWeight,
    onWeightBlur,
    weightError,
    gender,
    setGender,
    unitSystem,
    onUnitChange,
    isConnected,
    deviceStatus,
    batteryLevel,
    onConnect,
    onDisconnect,
    onForgetDevice,
    isSupported,
    currentHR,
    connectionStatus,
    bluetoothConnected,
    hasStarted,
    onReset,
    workoutStatus,
    onStartWorkout,
    onEndWorkout,
    hrHistory,
    setHrHistory,
    zoneDurations,
  } = props

  useEffect(() => {
    if (workoutStatus === 'running' && currentHR > 0) {
      setHrHistory((prev) => [...prev, { time: Date.now(), hr: currentHR }])
    }
  }, [currentHR, workoutStatus, setHrHistory])

  if (!isSupported) {
    return (
      <Container maxWidth="sm">
        <Box textAlign="center" my={4}>
          <BluetoothDisabledIcon
            sx={{ fontSize: 80, color: 'text.disabled' }}
          />
          <Typography variant="h5" component="h1" gutterBottom>
            Web Bluetooth Not Supported
          </Typography>
          <Typography color="textSecondary">
            Your browser does not support the Web Bluetooth API. Please use a
            compatible browser like Chrome, Edge, or Opera on a desktop or
            Android device.
          </Typography>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="md">
      <Box textAlign="center" my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          HRM Client Connect
        </Typography>
        <Typography color="textSecondary">
          Connect your heart rate monitor to start a session.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <UserSettings
            userName={userName || ''}
            setUserName={setUserName}
            userAge={userAge}
            setUserAge={setUserAge}
            onAgeBlur={onAgeBlur}
            ageError={ageError}
            userHeight={userHeight}
            setUserHeight={setUserHeight}
            onHeightBlur={onHeightBlur}
            heightError={heightError}
            userWeight={userWeight}
            setUserWeight={setUserWeight}
            onWeightBlur={onWeightBlur}
            weightError={weightError}
            gender={gender}
            setGender={setGender}
            unit={unitSystem}
            setUnit={onUnitChange}
          />
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-around" alignItems="center">
            <Button
              variant="contained"
              color="primary"
              onClick={onConnect}
              disabled={isConnected || !userName || !!ageError || !!weightError}
              startIcon={<BluetoothIcon />}
            >
              Connect HRM
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={onDisconnect}
              disabled={!isConnected}
              startIcon={<BluetoothConnectedIcon />}
            >
              Disconnect
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={onForgetDevice}
              disabled={!isConnected}
            >
              Forget Device
            </Button>
          </Box>
          <Typography
            variant="body2"
            color="textSecondary"
            textAlign="center"
            mt={2}
          >
            {deviceStatus}
            {batteryLevel !== null && ` | Battery: ${batteryLevel}%`}
          </Typography>
          <Typography
            variant="body2"
            color={connectionStatus === 'Connected' ? 'success.main' : 'error'}
            textAlign="center"
          >
            WebSocket: {connectionStatus}
          </Typography>
        </Grid>

        {bluetoothConnected && (
          <>
            <Grid item xs={12} sm={4}>
              <HrTileWithCalories
                user={{
                  clientId: 'local',
                  value: currentHR,
                  calories: caloriesBurned,
                }}
                isAlerting={false}
              />
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          <Box display="flex" justifyContent="center" gap={2} mt={2}>
            {workoutStatus !== 'running' ? (
              <Button
                variant="contained"
                color="success"
                onClick={onStartWorkout}
                disabled={!bluetoothConnected || workoutStatus === 'paused'}
              >
                Start Workout
              </Button>
            ) : (
              <Button
                variant="contained"
                color="warning"
                onClick={onEndWorkout}
                disabled={!bluetoothConnected}
              >
                End Workout
              </Button>
            )}
            {hasStarted && (
              <Button
                variant="outlined"
                color="error"
                onClick={onReset}
                disabled={workoutStatus === 'running'}
              >
                Reset
              </Button>
            )}
          </Box>
        </Grid>

        {workoutStatus !== 'idle' && (
          <Grid item xs={12}>
            <PerformanceDashboard
              hrHistory={hrHistory}
              zoneDurations={zoneDurations}
            />
          </Grid>
        )}
      </Grid>
    </Container>
  )
}

export default ConnectView

'use client'
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  CircularProgress,
  Paper,
} from '@mui/material'
import {
  Bluetooth as BluetoothIcon,
  BluetoothConnected as BluetoothConnectedIcon,
  Timer as TimerIcon,
  LocalFireDepartment as LocalFireDepartmentIcon,
  Favorite as FavoriteIcon,
} from '@mui/icons-material'
import UserSettings from './UserSettings'
import HeartRateZones from '@/components/HeartRateZones'
import HrTileWithCalories from '@/components/HrTileWithCalories'
import { WorkoutStatus } from '@/hooks/useWorkoutSession'
import { MeasurementSystem } from '../../../types/core'
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
  userHeight: string
  setUserHeight: (height: string) => void
  onHeightBlur: () => void
  heightError: string | null
  userWeight: string
  setUserWeight: (weight: string) => void
  onWeightBlur: () => void
  weightError: string | null
  gender: 'male' | 'female' | 'other' | null
  setGender: (gender: 'male' | 'female' | 'other') => void
  unitSystem: MeasurementSystem
  onUnitChange: (unit: MeasurementSystem) => void
  isConnected: boolean
  deviceStatus: string
  batteryLevel: number | null
  onConnect: () => void
  onDisconnect: () => void
  onForgetDevice: () => void
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
  zoneDurations: HrZoneDuration[]
}

const ConnectView = (props: ConnectViewProps) => {
  const {
    duration,
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
    hrZoneProps,
    connectionStatus,
    bluetoothConnected,
    hasStarted,
    onReset,
    workoutStatus,
    onStartWorkout,
    onEndWorkout,
    hrHistory,
    zoneDurations,
  } = props

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

      {!isSupported && (
        <Paper elevation={3} sx={{ p: 2, mb: 3, bgcolor: 'warning.light' }}>
          <Typography>
            Web Bluetooth API is not supported on this browser. Please use
            Chrome, Edge, or Opera on a compatible device.
          </Typography>
        </Paper>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <UserSettings
            userName={userName}
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
            unitSystem={unitSystem}
            onUnitChange={onUnitChange}
            isEditing={!bluetoothConnected}
          />
        </Grid>

        <Grid item xs={12}>
          <Box
            display="flex"
            justifyContent="space-around"
            alignItems="center"
          >
            <Button
              variant="contained"
              color="primary"
              onClick={onConnect}
              disabled={
                isConnected || !userName || !!ageError || !!weightError
              }
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
              variant="text"
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
                user={{clientId: 'local', value: currentHR, calories: caloriesBurned}}
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

export default ConnectView;

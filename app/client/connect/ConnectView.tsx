import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled'
import BottomNavBar from '../../../components/BottomNavBar'
import WorkoutSummary from './WorkoutSummary'
import React, { useState } from 'react'
import { MeasurementSystem, Gender } from '../../../types'
import {
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material'
import DeviceCard from './DeviceCard'
import { ConnectedDevice } from '@/hooks/useMultiDeviceBluetooth'

const WEIGHT_VALIDATION = {
  IMPERIAL: { min: 66, max: 440 }, // lbs
  METRIC: { min: 30, max: 200 }, // kg
}

const validate = (value: string, min: number, max: number, name: string) => {
  if (!value || value.trim() === '') {
    return null
  }
  const num = Number(value)
  if (isNaN(num) || num < min || num > max) {
    return `Please enter a valid ${name} (${min}-${max})`
  }
  return null
}

interface ConnectViewProps {
  duration: string
  caloriesBurned: number
  userName: string
  setUserName: (name: string) => void
  userAge: string
  setUserAge: (age: string) => void
  userHeight: string
  setUserHeight: (height: string) => void
  userWeight: string
  setUserWeight: (weight: string) => void
  onWeightBlur: () => void
  gender: Gender
  setGender: React.Dispatch<React.SetStateAction<Gender>>
  unitSystem: MeasurementSystem
  onUnitChange: (unit: MeasurementSystem) => void
  connectedDevices: Record<string, ConnectedDevice>
  onConnect: () => void
  onDisconnect: (deviceId: string) => void
  onForgetDevice: (deviceId: string) => Promise<void>
  isSupported: boolean
  connectionStatus: string
  hasStarted: boolean
  onReset: () => void
  workoutStatus: 'idle' | 'running' | 'paused'
  onStartWorkout: () => void
  onEndWorkout: () => void
}

export default function ConnectView({
  duration,
  caloriesBurned,
  userName,
  setUserName,
  userAge,
  setUserAge,
  userHeight,
  setUserHeight,
  userWeight,
  setUserWeight,
  onWeightBlur,
  gender,
  setGender,
  unitSystem,
  onUnitChange,
  connectedDevices,
  onConnect,
  onDisconnect,
  onForgetDevice,
  isSupported,
  connectionStatus,
  hasStarted,
  onReset,
  workoutStatus,
  onStartWorkout,
  onEndWorkout,
}: ConnectViewProps) {
  const [isResetting, setIsResetting] = useState(false)
  const [ageError, setAgeError] = useState<string | null>(null)
  const [heightError, setHeightError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)

  const weightValidationRange = WEIGHT_VALIDATION[unitSystem]

  const handleFullReset = async () => {
    setIsResetting(true)
    try {
      await Promise.all(
        Object.keys(connectedDevices).map((deviceId) =>
          onForgetDevice(deviceId)
        )
      )
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

  const isConnected = Object.values(connectedDevices).some((d) =>
    d.status.startsWith('Connected')
  )
  const showUserDetails = hasStarted || isConnected

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Connect Heart Rate Monitor
        </Typography>

        {!showUserDetails ? (
          <Stack spacing={2} sx={{ mb: 3 }}>
            <ToggleButtonGroup
              value={unitSystem}
              exclusive
              onChange={(_e, newUnit) => newUnit && onUnitChange(newUnit)}
              aria-label="measurement system"
              fullWidth
            >
              <ToggleButton value="IMPERIAL" aria-label="imperial">
                Imperial (lbs)
              </ToggleButton>
              <ToggleButton value="METRIC" aria-label="metric">
                Metric (kg)
              </ToggleButton>
            </ToggleButtonGroup>
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
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value)) {
                  setUserAge(e.target.value)
                }
              }}
              onBlur={(e) => {
                setAgeError(validate(e.target.value, 1, 120, 'age'))
              }}
              error={!!ageError}
              helperText={ageError}
              inputProps={{ min: 1, max: 120, 'aria-invalid': !!ageError }}
            />
            <TextField
              fullWidth
              label="Your Height (cm)"
              placeholder="e.g., 175"
              type="number"
              value={userHeight}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value)) {
                  setUserHeight(e.target.value)
                }
              }}
              onBlur={(e) => {
                setHeightError(validate(e.target.value, 100, 250, 'height'))
              }}
              error={!!heightError}
              helperText={heightError}
              inputProps={{ min: 100, max: 250, 'aria-invalid': !!heightError }}
            />
            <TextField
              fullWidth
              label={`Your Weight (${
                unitSystem === 'IMPERIAL' ? 'lbs' : 'kg'
              })`}
              placeholder={unitSystem === 'IMPERIAL' ? 'e.g., 150' : 'e.g., 70'}
              type="number"
              value={userWeight}
              onChange={(e) => {
                setUserWeight(e.target.value)
                setWeightError(
                  validate(
                    e.target.value,
                    weightValidationRange.min,
                    weightValidationRange.max,
                    'weight'
                  )
                )
              }}
              onBlur={onWeightBlur}
              error={!!weightError}
              helperText={weightError}
              inputProps={{
                min: weightValidationRange.min,
                max: weightValidationRange.max,
                'aria-invalid': !!weightError,
              }}
            />
            <FormControl component="fieldset">
              <FormLabel component="legend">Gender</FormLabel>
              <RadioGroup
                row
                aria-label="gender"
                name="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
              >
                <FormControlLabel
                  value="MALE"
                  control={<Radio />}
                  label="Male"
                />
                <FormControlLabel
                  value="FEMALE"
                  control={<Radio />}
                  label="Female"
                />
              </RadioGroup>
            </FormControl>
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

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={onConnect}
            disabled={!userName.trim() || !userAge.trim()}
          >
            Connect New Bluetooth HRM
          </Button>
        </Box>

        {Object.values(connectedDevices).map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onDisconnect={onDisconnect}
            onForget={onForgetDevice}
            userAge={parseInt(userAge, 10) || 0}
          />
        ))}

        {hasStarted && !isConnected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            All Devices Disconnected - Workout Paused
          </Alert>
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

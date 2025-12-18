import React, { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull'
import BatteryFullIcon from '@mui/icons-material/BatteryFull'
import BatteryStdIcon from '@mui/icons-material/BatteryStd'
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert'
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled'
import HrTile from '../../../components/HrTile'
import BottomNavBar from '../../../components/BottomNavBar'
import WorkoutSummary from './WorkoutSummary'
import { UserPreferences } from '@/hooks/useUserPreferences'
import { cmToInches, inchesToCm, kgToLbs, lbsToKg } from '@/lib/units'

const validate = (
  value: string,
  min: number,
  max: number,
  name: string
): string | null => {
  if (!value || value.trim() === '') {
    return `${name} is required.`
  }
  const num = Number(value)
  if (isNaN(num)) {
    return `${name} must be a number.`
  }
  if (num < min || num > max) {
    return `${name} must be between ${min} and ${max}.`
  }
  return null
}

interface ConnectViewProps {
  duration: string
  caloriesBurned: number
  userSettings: UserPreferences
  setUserSettings: (
    value: UserPreferences | ((val: UserPreferences) => UserPreferences)
  ) => void
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
}

export default function ConnectView({
  duration,
  caloriesBurned,
  userSettings,
  setUserSettings,
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
}: ConnectViewProps) {
  const [isResetting, setIsResetting] = useState(false)
  const [ageError, setAgeError] = useState<string | null>(null)
  const [heightError, setHeightError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)
  const [feet, setFeet] = useState('')
  const [inches, setInches] = useState('')
  const [localWeight, setLocalWeight] = useState('')

  useEffect(() => {
    if (userSettings.unit === 'imperial' && userSettings.height) {
      const totalInches = cmToInches(userSettings.height)
      let ft = Math.floor(totalInches / 12)
      let inch = Math.round(totalInches % 12)
      if (inch === 12) {
        ft += 1
        inch = 0
      }
      setFeet(ft.toString())
      setInches(inch.toString())
    }
    if (userSettings.unit === 'imperial' && userSettings.weight) {
      setLocalWeight(kgToLbs(userSettings.weight).toFixed(1))
    }
  }, [userSettings.unit, userSettings.height, userSettings.weight])

  const handleImperialHeightChange = (ft: string, inch: string) => {
    const totalInches = (parseInt(ft, 10) || 0) * 12 + (parseInt(inch, 10) || 0)
    setUserSettings((prev) => ({
      ...prev,
      height: inchesToCm(totalInches),
    }))
  }

  const validateImperialHeight = (ft: string, inch: string) => {
    const feetAsNum = Number(ft)
    const inchesAsNum = Number(inch)
    if (isNaN(feetAsNum) || feetAsNum < 3 || feetAsNum > 8) {
      return 'Please enter a valid height (feet between 3 and 8)'
    }
    if (isNaN(inchesAsNum) || inchesAsNum < 0 || inchesAsNum > 11) {
      return 'Please enter a valid height (inches between 0 and 11)'
    }
    return null
  }

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
              value={userSettings.userName || ''}
              onChange={(e) => {
                const sanitizedName = e.target.value.replace(
                  /[^a-zA-Z0-9 ]/g,
                  ''
                )
                setUserSettings((prev) => ({
                  ...prev,
                  userName: sanitizedName,
                }))
              }}
            />
            <TextField
              fullWidth
              label="Your Age"
              placeholder="e.g., 30"
              type="number"
              value={userSettings.userAge?.toString() || ''}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value)) {
                  setUserSettings((prev) => ({
                    ...prev,
                    userAge: e.target.value
                      ? parseInt(e.target.value, 10)
                      : null,
                  }))
                }
              }}
              onBlur={(e) => {
                setAgeError(validate(e.target.value, 1, 120, 'age'))
              }}
              error={!!ageError}
              helperText={ageError}
              inputProps={{ min: 1, max: 120, 'aria-invalid': !!ageError }}
            />
            <ToggleButtonGroup
              value={userSettings.unit}
              exclusive
              onChange={(_, newUnit) => {
                if (newUnit) {
                  setUserSettings((prev) => ({ ...prev, unit: newUnit }))
                }
              }}
              aria-label="Unit system"
            >
              <ToggleButton value="imperial" aria-label="imperial units">
                Imperial (lbs, ft, in)
              </ToggleButton>
              <ToggleButton value="metric" aria-label="metric units">
                Metric (kg, cm)
              </ToggleButton>
            </ToggleButtonGroup>
            {userSettings.unit === 'metric' ? (
              <>
                <TextField
                  fullWidth
                  label="Your Height (cm)"
                  placeholder="e.g., 175"
                  type="number"
                  value={userSettings.height?.toString() || ''}
                  onChange={(e) => {
                    if (/^\d*\.?\d*$/.test(e.target.value)) {
                      setUserSettings((prev) => ({
                        ...prev,
                        height: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      }))
                    }
                  }}
                  onBlur={(e) => {
                    setHeightError(validate(e.target.value, 100, 250, 'height'))
                  }}
                  error={!!heightError}
                  helperText={heightError}
                  inputProps={{
                    min: 100,
                    max: 250,
                    'aria-invalid': !!heightError,
                  }}
                />
                <TextField
                  fullWidth
                  label="Your Weight (kg)"
                  placeholder="e.g., 70"
                  type="number"
                  value={userSettings.weight?.toString() || ''}
                  onChange={(e) => {
                    if (/^\d*\.?\d*$/.test(e.target.value)) {
                      setUserSettings((prev) => ({
                        ...prev,
                        weight: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      }))
                    }
                  }}
                  onBlur={(e) => {
                    setWeightError(validate(e.target.value, 30, 200, 'weight'))
                  }}
                  error={!!weightError}
                  helperText={weightError}
                  inputProps={{
                    min: 30,
                    max: 200,
                    'aria-invalid': !!weightError,
                  }}
                />
              </>
            ) : (
              <>
                <Stack direction="row" spacing={2}>
                  <TextField
                    fullWidth
                    label="Feet"
                    placeholder="e.g., 5"
                    type="number"
                    value={feet}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value)) {
                        setFeet(e.target.value)
                        handleImperialHeightChange(e.target.value, inches)
                      }
                    }}
                    onBlur={() =>
                      setHeightError(validateImperialHeight(feet, inches))
                    }
                    error={!!heightError}
                  />
                  <TextField
                    fullWidth
                    label="Inches"
                    placeholder="e.g., 9"
                    type="number"
                    value={inches}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value)) {
                        setInches(e.target.value)
                        handleImperialHeightChange(feet, e.target.value)
                      }
                    }}
                    onBlur={() =>
                      setHeightError(validateImperialHeight(feet, inches))
                    }
                    error={!!heightError}
                  />
                </Stack>
                {heightError && (
                  <Typography color="error" variant="caption">
                    {heightError}
                  </Typography>
                )}
                <TextField
                  fullWidth
                  label="Your Weight (lbs)"
                  placeholder="e.g., 154"
                  type="number"
                  value={localWeight}
                  onChange={(e) => {
                    if (/^\d*\.?\d*$/.test(e.target.value)) {
                      setLocalWeight(e.target.value)
                    }
                  }}
                  onBlur={(e) => {
                    setUserSettings((prev) => ({
                      ...prev,
                      weight: e.target.value
                        ? lbsToKg(parseFloat(e.target.value))
                        : null,
                    }))
                    setWeightError(validate(e.target.value, 60, 440, 'weight'))
                  }}
                  error={!!weightError}
                  helperText={weightError}
                />
              </>
            )}
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
              {userSettings.userName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Age: {userSettings.userAge}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Height:{' '}
              {userSettings.height
                ? userSettings.unit === 'imperial'
                  ? `${feet} ft ${inches} in`
                  : `${userSettings.height} cm`
                : '--'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Weight:{' '}
              {userSettings.weight
                ? userSettings.unit === 'imperial'
                  ? `${kgToLbs(userSettings.weight).toFixed(1)} lbs`
                  : `${userSettings.weight} kg`
                : '--'}
            </Typography>
          </Box>
        )}

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
                !userSettings.userName?.trim() ||
                !userSettings.userAge ||
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
              name={userSettings.userName || ''}
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

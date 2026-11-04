import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull'
import BatteryFullIcon from '@mui/icons-material/BatteryFull'
import BatteryStdIcon from '@mui/icons-material/BatteryStd'
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert'
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled'
import HrTile from '../../../components/HrTile'
import WorkoutSummary from './WorkoutSummary'
import UserSettings from './UserSettings'
import { SignalQualityIndicator } from './SignalQualityIndicator'
import WorkoutControls from './WorkoutControls'
import ResetSection from './components/ResetSection'
import { useState, useEffect } from 'react'
import logger from '@/utils/logger'
import { WorkoutStatus } from '../../../types/workout'
import { UserProfileState, HrZoneData } from '@/types/connect'

interface ConnectViewProps {
  duration: string
  caloriesBurned: number
  userProfile: UserProfileState
  isConnected: boolean
  isDataStale?: boolean
  deviceStatus: string
  batteryLevel: number | null
  onConnect: () => void
  onDisconnect: () => void
  onForgetDevice: () => Promise<void>
  isSupported: boolean
  signalPeriodMs: number
  lastPeriodMs: number
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

interface ConnectionBannerArgs {
  deviceStatus: string
  isConnected: boolean
  hasStarted: boolean
  bluetoothConnected: boolean
}

interface ConnectionBanner {
  severity: 'error' | 'warning' | 'success' | 'info'
  text: string
}

// Exactly one status banner at a time, highest priority first: a named
// failure beats the workout-paused notice (pause state is also visible in
// the workout controls), which beats the connected confirmation, which
// beats transient progress info. Pure: unit-tested.
export const getConnectionBanner = ({
  deviceStatus,
  isConnected,
  hasStarted,
  bluetoothConnected,
}: ConnectionBannerArgs): ConnectionBanner | null => {
  const failed = deviceStatus && !isConnected && deviceStatus.includes('Failed')
  if (failed) {
    return { severity: 'error', text: deviceStatus }
  }
  if (hasStarted && !isConnected) {
    return {
      severity: 'warning',
      text: 'Device Disconnected - Workout Paused',
    }
  }
  if (isConnected && bluetoothConnected) {
    return {
      severity: 'success',
      text: 'Connected! Heart rate data is being streamed.',
    }
  }
  if (deviceStatus && !isConnected && !deviceStatus.includes('Disconnected')) {
    return { severity: 'info', text: deviceStatus }
  }
  return null
}

const BatteryIcon = ({ level }: { level: number }) => {
  if (level > 90) return <BatteryFullIcon color="success" />
  if (level > 50) return <BatteryChargingFullIcon color="action" />
  if (level > 20) return <BatteryStdIcon color="warning" />
  return <BatteryAlertIcon color="error" />
}

const ConnectLoading = ({ reducedMotion }: { reducedMotion: boolean }) => (
  <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
    {reducedMotion ? (
      <HourglassTopIcon
        data-testid="connect-loading"
        sx={{ fontSize: 40, color: 'text.secondary' }}
      />
    ) : (
      <CircularProgress data-testid="connect-loading" />
    )}
  </Container>
)

const BluetoothUnsupported = ({
  onFullReset,
  isResetting,
}: {
  onFullReset: () => void
  isResetting: boolean
}) => (
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
    <ResetSection onReset={onFullReset} isResetting={isResetting} />
  </Container>
)

const ConnectedIdentity = ({
  userName,
  userAge,
}: {
  userName: string
  userAge: string
}) => (
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
)

const ConnectButton = ({
  onConnect,
  disabled,
  connecting,
  reducedMotion,
}: {
  onConnect: () => void
  disabled: boolean
  connecting: boolean
  reducedMotion: boolean
}) => (
  <Button
    variant="contained"
    size="large"
    onClick={onConnect}
    disabled={disabled}
  >
    {connecting ? (
      <Stack direction="row" spacing={1} alignItems="center">
        {reducedMotion ? (
          <HourglassTopIcon sx={{ fontSize: 20 }} />
        ) : (
          <CircularProgress size={20} color="inherit" />
        )}
        <span>Connecting...</span>
      </Stack>
    ) : (
      'Connect Bluetooth HRM'
    )}
  </Button>
)

const ProfileSection = ({
  showUserProfile,
  userProfile,
  userName,
  userAge,
}: {
  showUserProfile: boolean
  userProfile: UserProfileState
  userName: string
  userAge: string
}) =>
  showUserProfile ? (
    <UserSettings profile={userProfile} />
  ) : (
    <ConnectedIdentity userName={userName} userAge={userAge} />
  )

const StatusBanner = ({ banner }: { banner: ConnectionBanner | null }) =>
  banner ? (
    <Alert
      data-testid="connection-status-alert"
      severity={banner.severity}
      sx={{ mb: 2 }}
    >
      {banner.text}
    </Alert>
  ) : null

const HrSection = ({
  isConnected,
  userName,
  currentHR,
  hrZoneData,
  caloriesBurned,
  isDataStale,
}: {
  isConnected: boolean
  userName: string
  currentHR: number
  hrZoneData: HrZoneData
  caloriesBurned: number
  isDataStale: boolean
}) =>
  isConnected ? (
    <Box sx={{ mt: 2 }} data-testid="hr-tile">
      <HrTile
        name={userName}
        value={currentHR}
        percentage={hrZoneData.percentage}
        zone={hrZoneData.zone}
        calories={caloriesBurned}
        isDataStale={isDataStale}
      />
    </Box>
  ) : null

const HistorySection = ({
  hasStarted,
  duration,
  caloriesBurned,
}: {
  hasStarted: boolean
  duration: string
  caloriesBurned: number
}) =>
  hasStarted ? (
    <WorkoutSummary duration={duration} caloriesBurned={caloriesBurned} />
  ) : null

const ConnectedPanel = ({
  batteryLevel,
  signalPeriodMs,
  lastPeriodMs,
  isConnected,
  onDisconnect,
  showStatusCaption,
  deviceStatus,
}: {
  batteryLevel: number | null
  signalPeriodMs: number
  lastPeriodMs: number
  isConnected: boolean
  onDisconnect: () => void
  showStatusCaption: boolean
  deviceStatus: string
}) => (
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
          <BatteryIcon level={batteryLevel} />
          <Typography variant="body2">{batteryLevel}% Battery</Typography>
        </Stack>
      )}
      <SignalQualityIndicator
        periodMs={signalPeriodMs}
        lastPeriodMs={lastPeriodMs}
        isConnected={isConnected}
      />
    </Box>
    <Button
      variant="outlined"
      size="large"
      onClick={onDisconnect}
      color="error"
    >
      Disconnect
    </Button>
    {showStatusCaption && (
      <Typography variant="caption" color="text.secondary">
        Status: {deviceStatus}
      </Typography>
    )}
  </Stack>
)

export default function ConnectView({
  duration,
  caloriesBurned,
  userProfile,
  isConnected,
  isDataStale = false,
  deviceStatus,
  batteryLevel,
  onConnect,
  onDisconnect,
  onForgetDevice,
  isSupported,
  signalPeriodMs,
  lastPeriodMs,
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
  const [mounted, setMounted] = useState(false)
  const { data } = userProfile

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isConnected) {
      logger.debug(
        { currentHR, userName: data.userName },
        'HrTile rendering with currentHR'
      )
    }
  }, [currentHR, isConnected, data.userName])

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

  // Reduced motion: static hourglass instead of the indeterminate spinner.
  // Same testid/layout so waits and VRT masks are unaffected.
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  if (!mounted) {
    return <ConnectLoading reducedMotion={prefersReducedMotion} />
  }

  if (!isSupported) {
    return (
      <BluetoothUnsupported
        onFullReset={handleFullReset}
        isResetting={isResetting}
      />
    )
  }

  const showUserDetails = hasStarted || isConnected

  const banner = getConnectionBanner({
    deviceStatus,
    isConnected,
    hasStarted,
    bluetoothConnected,
  })
  // Flattened render conditions (#9606): kept for the non-banner branches.
  const showUserProfile = !showUserDetails
  const isConnecting = deviceStatus.includes('Connecting')
  const hasProfile = Boolean(data.userName.trim() && data.userAge.trim())
  const showStatusCaption = deviceStatus !== 'Connected'

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Connect Heart Rate Monitor
        </Typography>

        <ProfileSection
          showUserProfile={showUserProfile}
          userProfile={userProfile}
          userName={data.userName}
          userAge={data.userAge}
        />

        <StatusBanner banner={banner} />

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {!isConnected ? (
            <ConnectButton
              onConnect={onConnect}
              disabled={!hasProfile || isConnecting}
              connecting={isConnecting}
              reducedMotion={prefersReducedMotion}
            />
          ) : (
            <ConnectedPanel
              batteryLevel={batteryLevel}
              signalPeriodMs={signalPeriodMs}
              lastPeriodMs={lastPeriodMs}
              isConnected={isConnected}
              onDisconnect={onDisconnect}
              showStatusCaption={showStatusCaption}
              deviceStatus={deviceStatus}
            />
          )}
        </Box>

        <HrSection
          isConnected={isConnected}
          userName={data.userName}
          currentHR={currentHR}
          hrZoneData={hrZoneData}
          caloriesBurned={caloriesBurned}
          isDataStale={isDataStale}
        />

        <WorkoutControls
          workoutStatus={workoutStatus}
          isConnected={isConnected}
          onStart={onStartWorkout}
          onPause={onPauseWorkout}
          onEnd={onEndWorkout}
          onResume={onStartWorkout}
        />

        <HistorySection
          hasStarted={hasStarted}
          duration={duration}
          caloriesBurned={caloriesBurned}
        />

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
    </>
  )
}

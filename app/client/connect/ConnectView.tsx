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
import { useFullReset } from '@/hooks/useFullReset'
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
// failure beats live BLE state, which beats the bare-disconnected notice,
// which beats the connected confirmation. A started workout must not mask
// recovery progress ("Reconnecting... (Attempt 3/8)", "Waiting for ... to
// wake up..."): the raw caption only renders while connected, so the banner
// is the only place that state is visible. Pure: unit-tested.
export const getConnectionBanner = ({
  deviceStatus,
  isConnected,
  hasStarted,
  bluetoothConnected,
}: ConnectionBannerArgs): ConnectionBanner | null => {
  if (!isConnected) {
    // An empty status cannot name a failure, so no emptiness guard here;
    // the live-state branch below needs one (empty must stay silent).
    if (deviceStatus.includes('Failed')) {
      return { severity: 'error', text: deviceStatus }
    }
    if (deviceStatus && !deviceStatus.includes('Disconnected')) {
      return {
        severity: hasStarted ? 'warning' : 'info',
        text: deviceStatus,
      }
    }
    if (hasStarted) {
      return { severity: 'warning', text: 'Device disconnected' }
    }
    return null
  }
  if (bluetoothConnected) {
    return {
      severity: 'success',
      text: 'Connected! Heart rate data is being streamed.',
    }
  }
  return null
}

interface ConnectViewStateInput {
  deviceStatus: string
  isConnected: boolean
  hasStarted: boolean
  bluetoothConnected: boolean
  userName: string
  userAge: string
}

interface ConnectViewState {
  showUserProfile: boolean
  isConnecting: boolean
  hasProfile: boolean
  showStatusCaption: boolean
  banner: ConnectionBanner | null
}

// Flattened render conditions (#9606): which profile block, whether the
// connect button spins (disabled) or is tappable, whether the status
// caption shows, and the single status banner. Pure: unit-tested.
export const resolveConnectViewState = (
  input: ConnectViewStateInput
): ConnectViewState => {
  const showUserDetails = input.hasStarted || input.isConnected
  return {
    showUserProfile: !showUserDetails,
    // Any in-flight radio op spins and disables the button, so a tap can
    // never collide with an attempt. Patient waiting is deliberately not
    // in-flight: the button stays tappable as a retry-now.
    isConnecting: /Connecting|Reconnecting|Scanning|Checking|Retrying/.test(
      input.deviceStatus
    ),
    hasProfile: Boolean(input.userName.trim() && input.userAge.trim()),
    showStatusCaption: input.deviceStatus !== 'Connected',
    banner: getConnectionBanner({
      deviceStatus: input.deviceStatus,
      isConnected: input.isConnected,
      hasStarted: input.hasStarted,
      bluetoothConnected: input.bluetoothConnected,
    }),
  }
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

const ConnectionSwitch = ({
  isConnected,
  onConnect,
  hasProfile,
  isConnecting,
  reducedMotion,
  batteryLevel,
  signalPeriodMs,
  lastPeriodMs,
  onDisconnect,
  showStatusCaption,
  deviceStatus,
}: {
  isConnected: boolean
  onConnect: () => void
  hasProfile: boolean
  isConnecting: boolean
  reducedMotion: boolean
  batteryLevel: number | null
  signalPeriodMs: number
  lastPeriodMs: number
  onDisconnect: () => void
  showStatusCaption: boolean
  deviceStatus: string
}) => (
  <Box sx={{ textAlign: 'center', mb: 3 }}>
    {!isConnected ? (
      <ConnectButton
        onConnect={onConnect}
        disabled={!hasProfile || isConnecting}
        connecting={isConnecting}
        reducedMotion={reducedMotion}
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
)

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

interface ConnectMainProps {
  view: ConnectViewProps
  state: ConnectViewState
  reset: {
    handleFullReset: () => Promise<void>
    isResetting: boolean
  }
  reducedMotion: boolean
}

// Main content below the mount/support gates: pure composition over the
// resolved view state, no hooks of its own.
const ConnectMain = ({
  view,
  state,
  reset,
  reducedMotion,
}: ConnectMainProps) => {
  const { data } = view.userProfile
  return (
    <>
      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Connect Heart Rate Monitor
        </Typography>

        <ProfileSection
          showUserProfile={state.showUserProfile}
          userProfile={view.userProfile}
          userName={data.userName}
          userAge={data.userAge}
        />

        <StatusBanner banner={state.banner} />

        <ConnectionSwitch
          isConnected={view.isConnected}
          onConnect={view.onConnect}
          hasProfile={state.hasProfile}
          isConnecting={state.isConnecting}
          reducedMotion={reducedMotion}
          batteryLevel={view.batteryLevel}
          signalPeriodMs={view.signalPeriodMs}
          lastPeriodMs={view.lastPeriodMs}
          onDisconnect={view.onDisconnect}
          showStatusCaption={state.showStatusCaption}
          deviceStatus={view.deviceStatus}
        />

        <ResetSection
          onReset={reset.handleFullReset}
          isResetting={reset.isResetting}
        />

        <HrSection
          isConnected={view.isConnected}
          userName={data.userName}
          currentHR={view.currentHR}
          hrZoneData={view.hrZoneData}
          caloriesBurned={view.caloriesBurned}
          isDataStale={view.isDataStale ?? false}
        />

        <WorkoutControls
          workoutStatus={view.workoutStatus}
          isConnected={view.isConnected}
          onStart={view.onStartWorkout}
          onPause={view.onPauseWorkout}
          onEnd={view.onEndWorkout}
          onResume={view.onStartWorkout}
        />

        <HistorySection
          hasStarted={view.hasStarted}
          duration={view.duration}
          caloriesBurned={view.caloriesBurned}
        />

        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 2 }}
        >
          WebSocket: {view.connectionStatus}
        </Typography>
      </Container>
    </>
  )
}

export default function ConnectView(props: ConnectViewProps) {
  const {
    isConnected,
    deviceStatus,
    onForgetDevice,
    isSupported,
    onReset,
    currentHR,
    hasStarted,
    bluetoothConnected,
    userProfile,
  } = props
  const [mounted, setMounted] = useState(false)
  const { data } = userProfile

  useEffect(() => {
    // One-shot hydration guard (empty deps): fires once, cannot cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // After the effects, where the reset closure lived: keeps hook order
  // (and effect execution order) identical to before the extraction.
  const reset = useFullReset(onForgetDevice, onReset)

  // Reduced motion: static hourglass instead of the indeterminate spinner.
  // Same testid/layout so waits and VRT masks are unaffected.
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  if (!mounted) {
    return <ConnectLoading reducedMotion={prefersReducedMotion} />
  }

  if (!isSupported) {
    return (
      <BluetoothUnsupported
        onFullReset={reset.handleFullReset}
        isResetting={reset.isResetting}
      />
    )
  }

  // Flattened render conditions (#9606): kept for the non-banner branches.
  const state = resolveConnectViewState({
    deviceStatus,
    isConnected,
    hasStarted,
    bluetoothConnected,
    userName: data.userName,
    userAge: data.userAge,
  })

  return (
    <ConnectMain
      view={props}
      state={state}
      reset={reset}
      reducedMotion={prefersReducedMotion}
    />
  )
}

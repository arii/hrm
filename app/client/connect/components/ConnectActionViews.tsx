import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import HrTile from '@/components/HrTile'
import WorkoutSummary from '../WorkoutSummary'
import WorkoutControls from '../WorkoutControls'
import ResetSection from './ResetSection'
import { WorkoutStatus } from '@/types/workout'
import { HrZoneData } from '@/types/connect'

export const ConnectButton = ({
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

export const HrSection = ({
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

export const ActionToolbar = ({
  onDisconnect,
  workoutStatus,
  isConnected,
  onStartWorkout,
  onPauseWorkout,
  onEndWorkout,
  onReset,
  isResetting,
}: {
  onDisconnect: () => void
  workoutStatus: WorkoutStatus
  isConnected: boolean
  onStartWorkout: () => void
  onPauseWorkout: () => void
  onEndWorkout: () => void
  onReset: () => void
  isResetting: boolean
}) => (
  <Box
    data-testid="action-toolbar"
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 2,
      mt: 2,
      mb: 2,
    }}
  >
    <Button
      variant="outlined"
      size="large"
      onClick={onDisconnect}
      color="error"
    >
      Disconnect
    </Button>
    <WorkoutControls
      workoutStatus={workoutStatus}
      isConnected={isConnected}
      onStart={onStartWorkout}
      onPause={onPauseWorkout}
      onEnd={onEndWorkout}
      onResume={onStartWorkout}
    />
    <ResetSection compact onReset={onReset} isResetting={isResetting} />
  </Box>
)

export const HistorySection = ({
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

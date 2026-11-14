import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { FOOTER_RESERVE_RESPONSIVE } from '@/constants/layout'
import type { ConnectViewState } from '../connectViewState'
import {
  ConnectButton,
  HrSection,
  ActionToolbar,
  HistorySection,
} from './ConnectActionViews'
import {
  DeviceHealthRow,
  MetadataStrip,
  ProfileSection,
  StatusBanner,
} from './ConnectStatusViews'
import ResetSection from './ResetSection'
import WorkoutControls from '../WorkoutControls'
import type { ConnectViewProps } from '../ConnectViewProps'

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
export const ConnectMain = ({
  view,
  state,
  reset,
  reducedMotion,
}: ConnectMainProps) => {
  const { data } = view.userProfile
  return (
    <>
      <Container maxWidth="sm" sx={{ py: 3, pb: FOOTER_RESERVE_RESPONSIVE }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Connect Heart Rate Monitor
        </Typography>

        <ProfileSection
          showUserProfile={state.showUserProfile}
          userProfile={view.userProfile}
        />

        <StatusBanner banner={state.banner} />

        {view.isConnected && (
          <DeviceHealthRow
            batteryLevel={view.batteryLevel}
            signalPeriodMs={view.signalPeriodMs}
            lastPeriodMs={view.lastPeriodMs}
            isConnected={view.isConnected}
          />
        )}

        {/* Live telemetry first: null-safe sections, so idle and
            disconnected views are unaffected by this order. */}
        <HrSection
          isConnected={view.isConnected}
          userName={data.userName}
          currentHR={view.currentHR}
          hrZoneData={view.hrZoneData}
          caloriesBurned={view.caloriesBurned}
          isDataStale={view.isDataStale ?? false}
        />

        {!state.showUserProfile && (
          <MetadataStrip
            userName={data.userName}
            userAge={data.userAge}
            isConnected={view.isConnected}
            deviceStatus={view.deviceStatus}
          />
        )}

        <HistorySection
          hasStarted={view.hasStarted}
          duration={view.duration}
          caloriesBurned={view.caloriesBurned}
        />

        {view.isConnected ? (
          <ActionToolbar
            onDisconnect={view.onDisconnect}
            workoutStatus={view.workoutStatus}
            isConnected={view.isConnected}
            onStartWorkout={view.onStartWorkout}
            onPauseWorkout={view.onPauseWorkout}
            onEndWorkout={view.onEndWorkout}
            onReset={reset.handleFullReset}
            isResetting={reset.isResetting}
          />
        ) : (
          <>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <ConnectButton
                onConnect={view.onConnect}
                disabled={!state.hasProfile || state.isConnecting}
                connecting={state.isConnecting}
                reducedMotion={reducedMotion}
              />
            </Box>
            <ResetSection
              onReset={reset.handleFullReset}
              isResetting={reset.isResetting}
            />
            <WorkoutControls
              workoutStatus={view.workoutStatus}
              isConnected={view.isConnected}
              onStart={view.onStartWorkout}
              onPause={view.onPauseWorkout}
              onEnd={view.onEndWorkout}
              onResume={view.onStartWorkout}
            />
          </>
        )}

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

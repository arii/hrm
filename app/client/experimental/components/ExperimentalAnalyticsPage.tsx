// app/client/experimental/components/ExperimentalAnalyticsPage.tsx
'use client'
import { useEffect, useMemo, useRef, useCallback } from 'react'
import { Container, Box, Button } from '@mui/material'
import { useWebSocket } from '@/context/WebSocketContext'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer'
import { useUserSettings } from '@/context/UserSettingsContext'
import { WorkoutSessionData } from '@/lib/workout-session-storage'
import { HeartRateZone } from '@/lib/shared/hr-zones'
import { calculateMaxHr } from '@/utils/hrCalculations'
import type { WorkoutStatus } from '@/types/workout'

// Components
import WorkoutSummary from './WorkoutSummary'
import CalorieTracker from './CalorieTracker'
import SessionList from './SessionList'
import SessionDetail from './SessionDetail'
import { HeartRateTimeSeries, ZoneDistribution } from './dynamicCharts'
import { useSessionList } from './useSessionList'

const defaultTimeInZones: Record<HeartRateZone, number> = {
  ZONE_0: 0,
  ZONE_1: 0,
  ZONE_2: 0,
  ZONE_3: 0,
  ZONE_4: 0,
  ZONE_5: 0,
  ZONE_6: 0,
}

interface SessionSummaryStats {
  avgHr: number
  maxHr: number
  timeInZones: Record<HeartRateZone, number>
  totalCalories: number
}

// Summary stats for the active session view. Pure: unit-tested.
export const computeSummaryStats = (
  activeSession:
    | Pick<WorkoutSessionData, 'hrHistory' | 'timeInZones'>
    | null
    | undefined,
  caloriesBurned: number
): SessionSummaryStats => {
  if (!activeSession)
    return {
      avgHr: 0,
      maxHr: 0,
      timeInZones: defaultTimeInZones,
      totalCalories: 0,
    }

  const hrValues = activeSession.hrHistory
    .map((d) => d.hr)
    .filter((hr) => hr > 0)
  const avgHr =
    hrValues.length > 0
      ? hrValues.reduce((sum, hr) => sum + hr, 0) / hrValues.length
      : 0
  const maxHr = hrValues.length > 0 ? Math.max(...hrValues) : 0

  return {
    avgHr,
    maxHr,
    timeInZones: activeSession.timeInZones,
    totalCalories: caloriesBurned,
  }
}

const WorkoutStatusActions = ({
  status,
  onStart,
  onPause,
  onResume,
  onEnd,
  onHistory,
}: {
  status: WorkoutStatus
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onEnd: () => void
  onHistory: () => void
}) => (
  <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
    {status === 'idle' && (
      <Button variant="contained" onClick={onStart}>
        Start Workout
      </Button>
    )}
    {status === 'running' && (
      <Button variant="outlined" onClick={onPause}>
        Pause
      </Button>
    )}
    {status === 'paused' && (
      <>
        <Button variant="contained" onClick={onResume}>
          Resume
        </Button>
        <Button variant="outlined" onClick={onEnd}>
          Finish Workout
        </Button>
      </>
    )}
    <Button variant="text" onClick={onHistory}>
      View History
    </Button>
  </Box>
)

// Newest-first session fetch shared by the init/end effects and delete
// handler (previously three copies of fetch + sort). State updates stay
// at the call sites (promise callbacks), never inside effects directly.
const ExperimentalAnalyticsPage = () => {
  const { hrmData, sendData, connectionStatus } = useWebSocket()
  const [userSettings] = useUserSettings()

  // Use #5110's hooks
  const {
    session: activeSession,
    status,
    isInitialized,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    addHrData,
    caloriesBurned,
  } = useWorkoutSessionManager()

  const duration = useWorkoutTimer(
    status,
    activeSession?.startTime,
    activeSession?.totalPaused,
    activeSession?.pauseTime,
    activeSession?.endTime
  )

  // Session list management lives in its own hook; the page keeps the
  // recording lifecycle, metadata sync, and rendering.
  const {
    allSessions,
    view,
    setView,
    selectedSession,
    handleViewSession,
    handleDeleteSession,
    handleBackToList,
  } = useSessionList({
    isInitialized,
    activeSessionEndTime: activeSession?.endTime,
    status,
    initialView: activeSession ? 'active' : 'list',
  })

  // Send user metadata when WebSocket connects
  useEffect(() => {
    if (connectionStatus === 'Connected') {
      const age = userSettings.userAge || 30
      const maxHr = calculateMaxHr(age)
      sendData({
        type: 'HRM_METADATA_UPDATE',
        data: {
          age,
          maxHr,
        },
      })
    }
  }, [connectionStatus, userSettings, sendData])

  /**
   * FIX: Use ref to avoid interval reset on HR updates (addresses audit issue #1)
   * This prevents the interval from being recreated on every hrmData change
   */
  const latestHrRef = useRef(0)

  useEffect(() => {
    latestHrRef.current = hrmData[0]?.value ?? 0
  }, [hrmData])

  // Recording interval - only depends on status, not hrmData
  useEffect(() => {
    if (status !== 'running') return

    const intervalId = setInterval(() => {
      const currentHr = latestHrRef.current
      // Add HR data point (handles calorie calc internally)
      addHrData(currentHr)
    }, 1000)

    return () => clearInterval(intervalId)
  }, [status, addHrData])

  // Handlers
  const handleStartWorkout = useCallback(() => {
    const age = userSettings.userAge || 30
    const weight = userSettings.userWeight || 70
    const maxHr = calculateMaxHr(age)

    startWorkout(age, weight, { maxHr })
    setView('active')
    // setView is the hook's stable useState setter; listed for exhaustive-deps.
  }, [startWorkout, userSettings, setView])

  const handlePauseWorkout = useCallback(() => {
    pauseWorkout()
  }, [pauseWorkout])

  const handleResumeWorkout = useCallback(() => {
    resumeWorkout()
  }, [resumeWorkout])

  const handleEndWorkout = useCallback(() => {
    endWorkout()
  }, [endWorkout])

  // Compute summary stats
  const summaryData = useMemo(
    () => computeSummaryStats(activeSession, caloriesBurned),
    [activeSession, caloriesBurned]
  )

  const defaultDate = useMemo(() => new Date(), [])

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} data-testid="dashboard">
      {view === 'active' && (
        <>
          <WorkoutStatusActions
            status={status}
            onStart={handleStartWorkout}
            onPause={handlePauseWorkout}
            onResume={handleResumeWorkout}
            onEnd={handleEndWorkout}
            onHistory={() => setView('list')}
          />

          <Box sx={{ display: 'grid', gap: 3 }}>
            <WorkoutSummary
              duration={duration}
              calories={summaryData.totalCalories}
              status={status}
              userName={userSettings.userName || 'Guest User'}
              date={
                activeSession ? new Date(activeSession.startTime) : defaultDate
              }
            />

            <CalorieTracker
              calorieHistory={activeSession?.calorieHistory || []}
            />

            <ZoneDistribution timeInZones={summaryData.timeInZones} />

            {activeSession && activeSession.hrHistory.length > 0 && (
              <HeartRateTimeSeries hrHistory={activeSession.hrHistory} />
            )}
          </Box>
        </>
      )}

      {view === 'list' && (
        <>
          <Box sx={{ mb: 3 }}>
            <Button variant="contained" onClick={() => setView('active')}>
              {activeSession ? 'Back to Active Workout' : 'New Workout'}
            </Button>
          </Box>
          <SessionList
            sessions={allSessions}
            onSelectSession={handleViewSession}
            onDeleteSession={handleDeleteSession}
          />
        </>
      )}

      {view === 'detail' && selectedSession && (
        <SessionDetail session={selectedSession} onBack={handleBackToList} />
      )}
    </Container>
  )
}

export default ExperimentalAnalyticsPage
